import { isAllowedIdentity, isAllowedTrailer, maskAddress, trailerAddresses } from '../lib/addresses.ts'
import { type Commit, MERGE_DIFFS, readCommits, readPatches } from '../lib/commits.ts'
import { addedLines } from '../lib/diff.ts'
import { git, runGit, topLevel, ZERO } from '../lib/git.ts'
import { gitleaksVersion, scanGit, type SecretFinding } from '../lib/gitleaks.ts'
import {
  crashed,
  type FailingCommit,
  G10,
  g11,
  g12,
  g13,
  passPrePush,
  type Rewrite,
  s3,
  s4,
  secretScanFailed,
} from '../lib/messages.ts'
import { print, seconds, shown } from '../lib/output.ts'
import { holdsTerm, loadTerms, nameHoldsTerm, type Terms, termLines } from '../lib/terms.ts'

// pre-push: no pushes to main, no rewritten history, and every commit the
// remote doesn't have checked again for secrets, private terms and addresses,
// along with the names of the branches and tags being pushed (FR-002, FR-006,
// FR-009, FR-016). It catches commits made with the hooks skipped.

const start = performance.now()

const SUBJECT_HIDDEN = '(subject not shown: it holds a private term)'
const ADDRESS_HIDDEN = '(an address that holds a private term)'

interface Update {
  localRef: string
  localSha: string
  remoteRef: string
  remoteSha: string
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk as Uint8Array))
  return Buffer.concat(chunks).toString('utf8')
}

function readUpdates(text: string): Update[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields.length === 4)
    .map(([localRef = '', localSha = '', remoteRef = '', remoteSha = '']) => ({ localRef, localSha, remoteRef, remoteSha }))
}

function shortName(ref: string): string {
  return ref.replace(/^refs\/(?:heads|tags)\//, '')
}

/** How each update would rewrite what the remote has (G11). */
function rewrites(updates: readonly Update[], remote: string, root: string): Rewrite[] {
  const found: Rewrite[] = []
  for (const update of updates) {
    if (ZERO.test(update.localSha) || ZERO.test(update.remoteSha) || update.localSha === update.remoteSha) continue
    if (update.remoteRef.startsWith('refs/tags/')) {
      found.push({ kind: 'moved-tag', remote, tag: shortName(update.remoteRef) })
      continue
    }
    const remoteBranch = `${remote}/${shortName(update.remoteRef)}`
    if (runGit(['cat-file', '-e', `${update.remoteSha}^{commit}`], { cwd: root }).status !== 0) {
      found.push({ kind: 'unfetched', remoteBranch })
      continue
    }
    if (runGit(['merge-base', '--is-ancestor', update.remoteSha, update.localSha], { cwd: root }).status === 0) continue
    const lost = Number(git(['rev-list', '--count', update.remoteSha, '--not', update.localSha], { cwd: root }).trim())
    found.push({ kind: 'lost', remoteBranch, lost })
  }
  return found
}

/** The rev-list arguments for every commit the updates send that the remote doesn't have. */
function outgoingRange(updates: readonly Update[], remote: string, root: string): string[] {
  const sending = [...new Set(updates.filter((u) => !ZERO.test(u.localSha)).map((u) => u.localSha))]
  if (sending.length === 0) return []
  const known = updates
    .map((u) => u.remoteSha)
    .filter((sha) => !ZERO.test(sha) && runGit(['cat-file', '-e', `${sha}^{commit}`], { cwd: root }).status === 0)
  return [...sending, '--not', ...new Set(known), `--remotes=${remote}`]
}

function commitProblems(commit: Commit, patch: string, secrets: readonly SecretFinding[], terms: Terms): string[] {
  const problems: string[] = []
  for (const secret of secrets) {
    problems.push(`possible secret at ${shown(secret.file, terms, 'a path that holds a private term')}:${secret.line} (rule ${secret.rule})`)
  }
  const added = addedLines(patch)
  const hiddenPaths = new Set(added.map((line) => line.file).filter((file) => nameHoldsTerm(file, terms)))
  if (hiddenPaths.size > 0) problems.push('private term in a file path')
  for (const line of added) {
    if (!hiddenPaths.has(line.file) && holdsTerm(line.text, terms)) problems.push(`private term at ${line.file}:${line.line}`)
  }
  for (const line of termLines(commit.message, terms)) problems.push(`private term in the message, line ${line}`)
  for (const [role, name, email] of [
    ['author', commit.authorName, commit.authorEmail],
    ['committer', commit.committerName, commit.committerEmail],
  ] as const) {
    if (holdsTerm(`${name} <${email}>`, terms)) problems.push(`private term in the ${role}'s name or address`)
    if (!isAllowedIdentity(email)) problems.push(`${role} ${shown(maskAddress(email), terms, ADDRESS_HIDDEN)} not allowed`)
  }
  for (const trailer of trailerAddresses(commit.message.split(/\r?\n/))) {
    if (isAllowedTrailer(trailer.address)) continue
    problems.push(`${trailer.key} ${shown(maskAddress(trailer.address), terms, ADDRESS_HIDDEN)} not allowed`)
  }
  return problems
}

async function main(): Promise<number> {
  const remote = process.argv[2] ?? 'origin'
  const root = topLevel(process.cwd()) ?? process.cwd()
  const updates = readUpdates(await readStdin())

  const loaded = loadTerms(process.env, root)
  if ('problem' in loaded) {
    const missing = gitleaksVersion(process.env) === undefined ? s4('pre-push') : []
    print([...s3('pre-push', loaded.problem, loaded.source), ...missing], undefined)
    return 1
  }
  const terms = loaded.terms

  const range = outgoingRange(updates, remote, root)
  const secrets = scanGit([`--log-opts=${range.length > 0 ? [MERGE_DIFFS, ...range].join(' ') : '--max-count=0'}`], root, process.env)

  const toMain = updates.some((update) => update.remoteRef === 'refs/heads/main')
  const rewritten = rewrites(updates, remote, root)
  const namedWithTerm = new Set<'branch' | 'tag'>()
  for (const update of updates) {
    for (const ref of [update.localRef, update.remoteRef]) {
      if (ref.startsWith('refs/') && nameHoldsTerm(shortName(ref), terms)) {
        namedWithTerm.add(update.remoteRef.startsWith('refs/tags/') ? 'tag' : 'branch')
      }
    }
  }
  const commits = range.length > 0 ? readCommits(range, root) : []
  const patches = range.length > 0 ? readPatches(range, root) : new Map<string, string>()

  const scan = await secrets
  if ('problem' in scan) {
    print(scan.problem === 'not-installed' ? s4('pre-push') : secretScanFailed('pre-push'), terms)
    return 1
  }

  const failing: FailingCommit[] = []
  for (const commit of commits) {
    const found = scan.findings.filter((finding) => finding.commit === commit.sha)
    const problems = commitProblems(commit, patches.get(commit.sha) ?? '', found, terms)
    if (problems.length === 0) continue
    const subject = commit.message.split(/\r?\n/)[0] ?? ''
    failing.push({ short: commit.short, subject: shown(subject, terms, SUBJECT_HIDDEN), problems })
  }

  const blocks: string[][] = []
  if (toMain) blocks.push(G10)
  if (rewritten.length > 0) blocks.push(g11(rewritten))
  if (failing.length > 0) blocks.push(g12(failing, commits.length))
  for (const kind of namedWithTerm) blocks.push(g13(kind))
  if (blocks.length > 0) {
    print(blocks.flat(), terms)
    return 1
  }
  print([passPrePush(commits.length, seconds(start))], terms)
  return 0
}

try {
  process.exitCode = await main()
} catch {
  print(crashed('pre-push'), undefined)
  process.exitCode = 1
}
