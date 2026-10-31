import { commandName, type Parsed, type SimpleCommand, variable } from './shell.ts'

// Finds the commands that merge or approve a pull request, or turn on
// auto-merge, whichever way they reach GitHub: gh pr, the REST API through gh
// api or an HTTP client, or a GraphQL mutation, inline or in a file (FR-017,
// FR-023). Each one notes the repo it names, when it names one.

export type Action = 'merge' | 'approve'

export interface PullRequestAction {
  action: Action
  /** owner/name, when the command names its repo. */
  repo: string | undefined
}

/** Reads a file a command names, relative to the session's folder. Undefined when it can't. */
export type ReadFile = (file: string) => string | undefined

const GRAPHQL_MERGE = /\b(?:mergePullRequest|enablePullRequestAutoMerge|mergeBranch)\b/
const GRAPHQL_APPROVE = /\bevent\s*:\s*\\?["']?APPROVE\b/
const JSON_APPROVE = /["']?event["']?\s*:\s*["']APPROVE["']/i
const PULL_MERGE = /(?:^|\/)repos\/([^/\s]+)\/([^/\s]+)\/pulls\/\d+\/merge\/?(?:[?#].*)?$/i
const BRANCH_MERGE = /(?:^|\/)repos\/([^/\s]+)\/([^/\s]+)\/merges\/?(?:[?#].*)?$/i
const REVIEWS = /(?:^|\/)repos\/([^/\s]+)\/([^/\s]+)\/pulls\/\d+\/reviews(?:\/\d+\/events)?\/?(?:[?#].*)?$/i
const API_URL = /https?:\/\/api\.github\.com(\/[^\s'"]*)/gi
const GRAPHQL_REPO = /repository\s*\(\s*owner\s*:\s*\\?"([^"\\]+)\\?"\s*,\s*name\s*:\s*\\?"([^"\\]+)\\?"/
const HTTP_CLIENTS = new Set(['curl', 'wget', 'http', 'https', 'xh', 'invoke-restmethod', 'irm', 'invoke-webrequest', 'iwr'])

/** owner/name from a repo flag's value: OWNER/NAME, HOST/OWNER/NAME or a URL. */
export function repoOf(value: string): string | undefined {
  const parts = value
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/\.git$/i, '')
    .split('/')
    .filter((part) => part !== '')
  if (parts.length < 2) return undefined
  const [owner, name] = parts.length === 2 ? parts : value.startsWith('http') ? parts.slice(0, 2) : parts.slice(-2)
  return owner !== undefined && name !== undefined ? `${owner}/${name}` : undefined
}

/** The repo a pull request URL in the words names: https://github.com/OWNER/NAME/pull/12. */
function urlRepo(words: readonly string[]): string | undefined {
  for (const word of words) {
    const match = /github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/\d+/i.exec(word)
    if (match !== null) return `${match[1]}/${match[2]}`
  }
  return undefined
}

/** The value of gh's -R/--repo flag, in any of its spellings. */
function repoFlag(words: readonly string[]): string | undefined {
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i] ?? ''
    if (word === '-R' || word === '--repo') return repoOf(words[i + 1] ?? '')
    if (word.startsWith('--repo=')) return repoOf(word.slice(7))
    if (/^-R./.test(word)) return repoOf(word.slice(2))
  }
  return undefined
}

/** Whether gh pr review's flags approve: --approve, -a, or -a in a cluster of short flags. */
function approves(words: readonly string[]): boolean {
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i] ?? ''
    if (word === '--') return false
    if (word === '--approve' || word === '--approve=true') return true
    // A flag's value, such as a review body, is never a flag of its own.
    if (['-b', '--body', '-F', '--body-file', '-R', '--repo'].includes(word)) {
      i += 1
      continue
    }
    if (/^-[^-]/.test(word)) {
      for (const flag of word.slice(1)) {
        if (flag === 'a') return true
        // -b and -F take a value, which is the rest of the cluster.
        if ('bFR'.includes(flag)) break
      }
    }
  }
  return false
}

interface ApiCall {
  endpoint: string
  method: string | undefined
  fields: Map<string, string[]>
  input: string | undefined
}

const API_VALUE_FLAGS = new Set(['-X', '--method', '-f', '--raw-field', '-F', '--field', '-H', '--header', '--input', '-q', '--jq', '-t', '--template', '--hostname', '--cache', '-p', '--preview'])

function readApiCall(args: readonly string[]): ApiCall {
  const call: ApiCall = { endpoint: '', method: undefined, fields: new Map(), input: undefined }
  const field = (pair: string): void => {
    const eq = pair.indexOf('=')
    const key = eq < 0 ? pair : pair.slice(0, eq)
    call.fields.set(key, [...(call.fields.get(key) ?? []), eq < 0 ? '' : pair.slice(eq + 1)])
  }
  for (let i = 0; i < args.length; i += 1) {
    const word = args[i] ?? ''
    const long = /^(--[a-z-]+)=(.*)$/s.exec(word)
    const flag = long?.[1] ?? word
    const value = long !== null ? long[2] : args[i + 1]
    if (/^-[fF].+/.test(word) && long === null) {
      field(word.slice(2))
      continue
    }
    if (/^-X.+/.test(word)) {
      call.method = word.slice(2)
      continue
    }
    if (API_VALUE_FLAGS.has(flag)) {
      if (long === null) i += 1
      if (flag === '-X' || flag === '--method') call.method = value
      else if (['-f', '--raw-field', '-F', '--field'].includes(flag)) field(value ?? '')
      else if (flag === '--input') call.input = value
      continue
    }
    if (!word.startsWith('-') && call.endpoint === '') call.endpoint = word
  }
  return call
}

/** The text a field's value stands for: itself, or a file's contents for -F key=@file. */
function fieldText(value: string, readFile: ReadFile, stdin: string): string | undefined {
  if (!value.startsWith('@')) return value
  if (value === '@-') return stdin
  return readFile(value.slice(1))
}

function ghApi(command: SimpleCommand, args: readonly string[], readFile: ReadFile): PullRequestAction | undefined {
  const call = readApiCall(args)
  const endpoint = call.endpoint.replace(/^https?:\/\/api\.github\.com/i, '')
  const method = (call.method ?? (call.fields.size > 0 || call.input !== undefined ? 'POST' : 'GET')).toUpperCase()
  const writes = method !== 'GET' && method !== 'HEAD'
  const named = /repos\/([^/\s]+)\/([^/\s]+)\//i.exec(endpoint)
  const repo = named !== null && !named[1]?.startsWith('{') ? `${named[1]}/${named[2]}` : undefined
  const fileText = call.input === undefined ? '' : call.input === '-' ? command.input : (readFile(call.input) ?? undefined)

  if (/^\/?graphql\/?$/i.test(endpoint)) {
    const texts: string[] = []
    let unreadable = fileText === undefined
    for (const [key, values] of call.fields) {
      for (const value of values) {
        const text = fieldText(value, readFile, command.input)
        if (text === undefined) unreadable = true
        else texts.push(key === 'query' ? text : `${key}=${text}`)
      }
    }
    if (fileText !== undefined) texts.push(fileText)
    const query = texts.join('\n')
    const inQuery = GRAPHQL_REPO.exec(query)
    const queryRepo = inQuery === null ? undefined : `${inQuery[1]}/${inQuery[2]}`
    // A query file that can't be read counts as a merge, so the guard fails closed.
    if (unreadable || GRAPHQL_MERGE.test(query)) return { action: 'merge', repo: queryRepo }
    if (GRAPHQL_APPROVE.test(query) || (call.fields.get('event') ?? []).some((v) => /^APPROVE$/i.test(v))) {
      return { action: 'approve', repo: queryRepo }
    }
    return undefined
  }
  if (writes && (PULL_MERGE.test(endpoint) || BRANCH_MERGE.test(endpoint))) return { action: 'merge', repo }
  if (REVIEWS.test(endpoint)) {
    // A body that can't be read counts as an approval, so the guard fails closed.
    const event = (call.fields.get('event') ?? []).some((value) => /^APPROVE$/i.test(fieldText(value, readFile, command.input) ?? 'APPROVE'))
    if (event || fileText === undefined || JSON_APPROVE.test(fileText)) return { action: 'approve', repo }
  }
  return undefined
}

function httpClient(command: SimpleCommand): PullRequestAction | undefined {
  const text = [...command.words.slice(1), command.input].join(' ')
  for (const match of text.matchAll(API_URL)) {
    const endpoint = match[1] ?? ''
    const named = /^\/repos\/([^/\s]+)\/([^/\s]+)\//i.exec(endpoint)
    const repo = named === null ? undefined : `${named[1]}/${named[2]}`
    if (PULL_MERGE.test(endpoint) || BRANCH_MERGE.test(endpoint)) return { action: 'merge', repo }
    if (REVIEWS.test(endpoint) && /APPROVE/i.test(text)) return { action: 'approve', repo }
    if (/^\/graphql\b/i.test(endpoint)) {
      const inQuery = GRAPHQL_REPO.exec(text)
      const queryRepo = inQuery === null ? undefined : `${inQuery[1]}/${inQuery[2]}`
      if (GRAPHQL_MERGE.test(text)) return { action: 'merge', repo: queryRepo }
      if (GRAPHQL_APPROVE.test(text)) return { action: 'approve', repo: queryRepo }
    }
  }
  return undefined
}

/** Every merge or approval the parsed command would make. */
export function pullRequestActions(parsed: Parsed, readFile: ReadFile): PullRequestAction[] {
  const found: PullRequestAction[] = []
  for (const command of parsed.commands) {
    const name = commandName(command)
    const words = command.words
    if (name === 'gh') {
      const args = words.slice(1)
      const [group, verb] = args.filter((word) => !word.startsWith('-'))
      const rest = args.slice(args.indexOf(verb ?? '') + 1)
      const repo = () => repoFlag(rest) ?? urlRepo(rest) ?? repoOf(variable(command, 'GH_REPO') ?? '')
      if (group === 'pr' && verb === 'merge') found.push({ action: 'merge', repo: repo() })
      else if (group === 'pr' && verb === 'review' && approves(rest)) found.push({ action: 'approve', repo: repo() })
      else if (group === 'api') {
        const action = ghApi(command, args.slice(args.indexOf('api') + 1), readFile)
        if (action !== undefined) found.push({ ...action, repo: action.repo ?? repoOf(variable(command, 'GH_REPO') ?? '') })
      }
    } else if (HTTP_CLIENTS.has(name)) {
      const action = httpClient(command)
      if (action !== undefined) found.push(action)
    }
  }
  return found
}

/** Whether an MCP tool merges, turns on auto-merge or approves, judged by its name and input. */
export function mcpAction(toolName: string, toolInput: unknown): Action | undefined {
  const tool = toolName.toLowerCase()
  if (/(?:^|__)(?:set_auto_merge|enable_auto_merge|merge_pull_request|merge_pr|merge)$/.test(tool)) return 'merge'
  if (/(?:^|__)(?:approve_pull_request|create_pull_request_review|submit_pull_request_review|pull_request_review_write)$/.test(tool)) {
    return /APPROVE/i.test(JSON.stringify(toolInput) ?? '') ? 'approve' : undefined
  }
  return undefined
}
