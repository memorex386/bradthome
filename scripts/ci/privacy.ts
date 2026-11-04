import { isAllowedIdentity, isAllowedTrailer, maskAddress, trailerAddresses } from '../lib/addresses.ts'
import { readCommits, readPatches } from '../lib/commits.ts'
import { addedLines } from '../lib/diff.ts'
import { topLevel } from '../lib/git.ts'
import { ciCrashed, K6, k3, k4 } from '../lib/messages.ts'
import { print } from '../lib/output.ts'
import { envValue, holdsTerm, nameHoldsTerm, parseTerms, type Terms, termLines, VARIABLE } from '../lib/terms.ts'
import { commitRange, prTextMode, readEvent } from './lib/event.ts'

// The privacy job (FR-005–FR-008, S2.1, S2.2, S2.4, S2.5): every commit in the
// pull request or push, the lines each one adds and the paths it changes, its
// message and its addresses, and the pull request's branch name, title and
// description. The list comes only from the PRIVATE_TERMS secret, and the log
// names places, never terms. Every line passes the output gate. PR_TEXT
// narrows it: ci.yml skips the title and description, and pr-text.yml's text
// check reads only those (S2.6, D115).

const PATH_HIDDEN = "a changed file's path"
const DEPENDABOT_LOGIN = 'dependabot[bot]'
const DEPENDABOT_EMAIL = '49699333+dependabot[bot]@users.noreply.github.com'

/** Dependabot signs off with GitHub's support address, which passes on its own commits only (D83). */
function isDependabotSignOff(key: string, address: string): boolean {
  return key.toLowerCase() === 'signed-off-by' && address.trim().toLowerCase() === 'support@github.com'
}

/**
 * dependabotRun is false on a pull request someone else opened: anyone can set
 * their author address to Dependabot's, so the address alone proves nothing.
 */
function placesInCommits(
  range: readonly string[],
  root: string,
  terms: Terms,
  dependabotRun: boolean,
): { places: string[]; addresses: string[]; count: number } {
  const commits = readCommits(range, root).reverse()
  const patches = readPatches(range, root)
  const places: string[] = []
  const addresses: string[] = []
  let pathHidden = false
  for (const commit of commits) {
    const added = addedLines(patches.get(commit.sha) ?? '')
    for (const file of new Set(added.map((line) => line.file))) if (nameHoldsTerm(file, terms)) pathHidden = true
    for (const line of added) {
      if (!nameHoldsTerm(line.file, terms) && holdsTerm(line.text, terms)) places.push(`${line.file}:${line.line}`)
    }
    for (const line of termLines(commit.message, terms)) places.push(`commit ${commit.short}, message line ${line}`)
    for (const [role, name, email] of [
      ['author', commit.authorName, commit.authorEmail],
      ['committer', commit.committerName, commit.committerEmail],
    ] as const) {
      if (holdsTerm(`${name} <${email}>`, terms)) places.push(`commit ${commit.short}, the ${role}'s name or address`)
      // An address both roles share is shown once, as the author's.
      const shared = role === 'committer' && email.toLowerCase() === commit.authorEmail.toLowerCase()
      if (!shared && !isAllowedIdentity(email)) addresses.push(`${commit.short}  ${role.padEnd(9)}  ${maskAddress(email)}`)
    }
    const byDependabot = dependabotRun && commit.authorEmail.toLowerCase() === DEPENDABOT_EMAIL
    for (const trailer of trailerAddresses(commit.message.split(/\r?\n/))) {
      if (byDependabot && isDependabotSignOff(trailer.key, trailer.address)) continue
      if (!isAllowedTrailer(trailer.address)) addresses.push(`${commit.short}  ${'trailer'.padEnd(9)}  ${maskAddress(trailer.address)}`)
    }
  }
  if (pathHidden) places.push(PATH_HIDDEN)
  return { places, addresses, count: commits.length }
}

function main(): number {
  const list = envValue(process.env, VARIABLE)
  const terms = list === undefined ? undefined : parseTerms(list)
  if (terms === undefined || terms.count === 0) {
    print(K6, undefined, process.stdout)
    return 1
  }
  const mode = prTextMode(process.env)
  const root = topLevel(process.cwd()) ?? process.cwd()
  const event = readEvent()
  const pr = event.pullRequest
  const dependabotRun = pr === undefined || pr.user === DEPENDABOT_LOGIN
  const { places, addresses, count } =
    mode === 'only' ? { places: [], addresses: [], count: 0 } : placesInCommits(commitRange(event), root, terms, dependabotRun)

  if (pr !== undefined) {
    if (mode !== 'only' && nameHoldsTerm(pr.branch, terms)) places.push('the branch name')
    if (mode !== 'skip') {
      if (holdsTerm(pr.title, terms)) places.push("the pull request's title")
      for (const line of termLines(pr.body, terms)) places.push(`the pull request's description, line ${line}`)
    }
  }

  const blocks: string[][] = []
  if (places.length > 0) blocks.push(k3([...new Set(places)]))
  if (addresses.length > 0) blocks.push(k4([...new Set(addresses)]))
  if (blocks.length > 0) {
    print(blocks.flat(), terms, process.stdout)
    return 1
  }
  const commits = `${count} ${count === 1 ? 'commit' : 'commits'}`
  const line =
    mode === 'only'
      ? 'the title and the description checked'
      : pr === undefined
        ? `${commits} checked`
        : mode === 'skip'
          ? `${commits} and the branch name checked`
          : `${commits}, the branch name, the title and the description checked`
  print([`✓ privacy  ${line}`], terms, process.stdout)
  return 0
}

try {
  process.exitCode = main()
} catch {
  print(ciCrashed('privacy'), undefined, process.stdout)
  process.exitCode = 1
}
