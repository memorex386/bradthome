// What a command does to a pull request, for the guard (FR-017). The guard
// passes each subcommand here, with any leading VAR=value assignments removed,
// and denies a merge or an approval through gh, the REST API or GraphQL.

export type PullRequestAction = 'merge' | 'approve'

/** Reads a file the command names, relative to the session's folder. */
export type ReadFile = (file: string) => string | undefined

const PR_MERGE = /^gh\s+pr\s+merge\b/
const PR_APPROVE = /^gh\s+pr\s+review\b(?=.*\s(?:--approve|-a)(?:\s|$))/
const GRAPHQL_MERGE = /\b(?:mergePullRequest|enablePullRequestAutoMerge)\b/
const GRAPHQL_APPROVE = /\bevent\s*:\s*APPROVE\b/
// The REST paths, whichever client calls them: gh api, curl or Invoke-RestMethod.
const REST_APPROVE = /\/pulls\/\d+\/reviews\b.*\bevent=APPROVE\b/

/**
 * The GraphQL a command sends: its own text, plus any query it reads from a
 * -F query=@file. A file that can't be read counts as a merge, so the guard
 * fails closed.
 */
function graphql(command: string, readFile: ReadFile): string {
  const file = /(?:-F|--field)\s+query=@(\S+)/.exec(command)?.[1]
  if (file === undefined) return command
  return `${command}\n${readFile(file) ?? 'mergePullRequest'}`
}

export function pullRequestAction(command: string, readFile: ReadFile): PullRequestAction | undefined {
  const words = command.trim()
  const query = graphql(words, readFile)
  if (PR_MERGE.test(words) || GRAPHQL_MERGE.test(query)) return 'merge'
  if (PR_APPROVE.test(words) || GRAPHQL_APPROVE.test(query) || REST_APPROVE.test(words)) return 'approve'
  return undefined
}
