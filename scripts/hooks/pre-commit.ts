import { isAllowedIdentity, maskAddress, parseIdent } from '../lib/addresses.ts'
import { copyProblemsInIndex, STAGED_COPIES } from '../lib/copies.ts'
import { addedLines } from '../lib/diff.ts'
import { gitAsync, runGitAsync, splitZ } from '../lib/git.ts'
import { scanGit } from '../lib/gitleaks.ts'
import { LOCK_FILE, lockedChanges } from '../lib/locks.ts'
import { crashed, G1, g2, g3, g4, g5, g6, passPreCommit, s3, s4, secretScanFailed } from '../lib/messages.ts'
import { print, seconds, shown } from '../lib/output.ts'
import { holdsTerm, loadTermsAsync, nameHoldsTerm, type Terms } from '../lib/terms.ts'

// pre-commit: main, secrets, private terms, addresses, locked tests and copies
// (FR-001, FR-003, FR-005–FR-008, FR-011, FR-014, FR-016). A commit on main
// and a check that can't run stop first. Otherwise every block is shown.
// Independent git calls start together, since each one is slow to start on
// Windows and the hooks have a time budget (SC-003).

const start = performance.now()

const PATH_HIDDEN = "a staged file's path, which isn't shown"
const ADDRESS_HIDDEN = '(an address that holds a private term, not shown)'
const PATCH = [
  '-c',
  'core.quotePath=false',
  'diff',
  '--cached',
  '-U0',
  '--no-color',
  '--no-ext-diff',
  '--no-renames',
  '--no-relative',
  '--src-prefix=a/',
  '--dst-prefix=b/',
]

interface Staged {
  /** Every staged path, deletions included. */
  all: string[]
  /** The paths the commit adds or changes. */
  kept: string[]
}

function readStaged(nameStatus: string): Staged {
  const fields = splitZ(nameStatus)
  const all: string[] = []
  const kept: string[] = []
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const status = fields[i] ?? ''
    const file = fields[i + 1] ?? ''
    all.push(file)
    if (!status.startsWith('D')) kept.push(file)
  }
  return { all, kept }
}

interface Person {
  role: 'author' | 'committer'
  name: string
  email: string
}

function readPeople(vars: string): Person[] {
  const values = new Map<string, string>()
  for (const line of vars.split('\n')) {
    const at = line.indexOf('=')
    if (at > 0) values.set(line.slice(0, at), line.slice(at + 1))
  }
  return (['author', 'committer'] as const).map((role) => ({
    role,
    ...parseIdent(values.get(role === 'author' ? 'GIT_AUTHOR_IDENT' : 'GIT_COMMITTER_IDENT') ?? ''),
  }))
}

function termPlaces(staged: Staged, patch: string, terms: Terms, people: readonly Person[]): string[] {
  const places: string[] = []
  const hiddenPaths = new Set(staged.kept.filter((file) => nameHoldsTerm(file, terms)))
  if (hiddenPaths.size > 0) places.push(PATH_HIDDEN)
  for (const added of addedLines(patch)) {
    if (hiddenPaths.has(added.file) || !holdsTerm(added.text, terms)) continue
    places.push(`${added.file}:${added.line}`)
  }
  for (const person of people) {
    if (holdsTerm(`${person.name} <${person.email}>`, terms)) places.push(`the ${person.role}'s name or address, which isn't shown`)
  }
  return places
}

async function main(): Promise<number> {
  // git runs hooks from the root of the working tree.
  const root = process.cwd()
  const options = { cwd: root }
  const secrets = scanGit(['--staged'], root, process.env)
  const [branch, loaded, nameStatus, patch, vars, copies] = await Promise.all([
    runGitAsync(['symbolic-ref', '--quiet', '--short', 'HEAD'], options),
    loadTermsAsync(process.env, root),
    gitAsync(['diff', '--cached', '--name-status', '-z', '--no-renames'], options),
    gitAsync(PATCH, options),
    gitAsync(['var', '-l'], options),
    gitAsync(STAGED_COPIES, options),
  ])
  if (branch.status === 0 && branch.stdout.trim() === 'main') {
    print(G1, undefined)
    return 1
  }
  if ('problem' in loaded) {
    const scan = await secrets
    print([...s3('pre-commit', loaded.problem, loaded.source), ...('problem' in scan && scan.problem === 'not-installed' ? s4('pre-commit') : [])], undefined)
    return 1
  }
  const terms = loaded.terms

  const staged = readStaged(nameStatus)
  const people = readPeople(vars)
  const places = termPlaces(staged, patch, terms, people)
  const addresses = people
    .filter((person) => !isAllowedIdentity(person.email))
    .map((person) => `${person.role.padEnd(9)}  ${shown(maskAddress(person.email), terms, ADDRESS_HIDDEN)}`)
  // Every locked file sits in a spec's test folder, tests/NNN/ (D78), so a
  // commit that touches no test and no tests.lock needs no lookup.
  const touchesTests = staged.all.some((file) => file.startsWith('tests/') || LOCK_FILE.test(file))
  const locked = touchesTests ? lockedChanges(staged.all, options) : []
  const stale = copyProblemsInIndex(copies)

  const scan = await secrets
  if ('problem' in scan) {
    print(scan.problem === 'not-installed' ? s4('pre-commit') : secretScanFailed('pre-commit'), terms)
    return 1
  }

  const blocks: string[][] = []
  if (scan.findings.length > 0) {
    const findings = scan.findings.map(
      (finding) => `${shown(finding.file, terms, '(a path that holds a private term)')}:${finding.line}  rule ${finding.rule}  value REDACTED`,
    )
    blocks.push(g2(findings))
  }
  if (places.length > 0) blocks.push(g3(places))
  if (addresses.length > 0) blocks.push(g4(addresses))
  if (locked.length > 0) blocks.push(g5(locked))
  if (stale.length > 0) blocks.push(g6(stale))
  if (blocks.length > 0) {
    print(blocks.flat(), terms)
    return 1
  }
  print([passPreCommit(seconds(start))], terms)
  return 0
}

try {
  process.exitCode = await main()
} catch {
  print(crashed('pre-commit'), undefined)
  process.exitCode = 1
}
