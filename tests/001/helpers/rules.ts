// A small matcher for Claude Code's permission rules, written from its
// permissions docs (code.claude.com/docs/en/permissions, read 2026-10-31):
//
// - A * in a Bash or PowerShell rule matches any text, spaces included. A
//   trailing " *" that's the rule's only wildcard also matches the bare
//   command, and ":*" at the end means the same as " *".
// - Deny and ask rules match any subcommand of a compound command, including
//   one in a subshell or a command substitution, and match past leading
//   VAR=value assignments and a fixed set of wrappers.
// - PowerShell rules have the same shape and match without regard to case.
// - Edit rules use gitignore patterns and cover every tool that edits files.
//   Write(path) rules never match. "/path" anchors at the project root, a
//   bare name matches at any depth, and so does a single directory segment
//   such as "src/**" in a deny or ask rule. Other shapes match only where
//   they're anchored.
// - Other tools match by name, and a name may be a glob.

export type RuleKind = 'allow' | 'deny' | 'ask'

export type Call =
  | { tool: 'Bash' | 'PowerShell'; command: string }
  | { tool: 'Edit' | 'Write'; path: string }
  | { tool: string }

interface Rule {
  tool: string
  content: string | undefined
}

function parseRule(rule: string): Rule {
  const match = /^([^()]+?)(?:\(([\s\S]*)\))?$/.exec(rule.trim())
  if (match === null) throw new Error(`can't read the rule ${rule}`)
  return { tool: match[1] ?? '', content: match[2] }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toolMatches(ruleTool: string, tool: string): boolean {
  if (ruleTool.includes('*')) {
    return new RegExp(`^${ruleTool.split('*').map(escapeRegExp).join('.*')}$`).test(tool)
  }
  if (ruleTool === tool) return true
  // A rule naming an MCP server covers each of its tools.
  return ruleTool.startsWith('mcp__') && ruleTool.split('__').length === 2 && tool.startsWith(`${ruleTool}__`)
}

export function shellPatternMatches(pattern: string, command: string, ignoreCase: boolean): boolean {
  let rule = pattern
  if (rule.endsWith(':*')) rule = `${rule.slice(0, -2)} *`
  const stars = rule.split('*').length - 1
  let source: string
  if (stars === 1 && rule.endsWith(' *')) {
    source = `${escapeRegExp(rule.slice(0, -2))}(?: [\\s\\S]*)?`
  } else {
    source = rule.split('*').map(escapeRegExp).join('[\\s\\S]*')
  }
  return new RegExp(`^${source}$`, ignoreCase ? 'i' : '').test(command)
}

/** Splits a command into its parts at the operators, outside quotes. */
function splitTopLevel(command: string, operators: readonly string[]): string[] {
  const parts: string[] = []
  let current = ''
  let quote: '"' | "'" | undefined
  let depth = 0
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i] ?? ''
    if (quote !== undefined) {
      if (ch === quote) quote = undefined
      else if (ch === '\\' && quote === '"') {
        current += ch + (command[i + 1] ?? '')
        i += 1
        continue
      }
      current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
      continue
    }
    if (ch === '(') depth += 1
    if (ch === ')') depth = Math.max(0, depth - 1)
    const operator = depth === 0 ? operators.find((op) => command.startsWith(op, i)) : undefined
    if (operator !== undefined) {
      parts.push(current)
      current = ''
      i += operator.length - 1
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts.map((part) => part.trim()).filter((part) => part !== '')
}

/** The commands inside $( … ), backticks and ( … ) subshells. */
function nested(command: string): string[] {
  const found: string[] = []
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i]
    if (ch === '`') {
      const end = command.indexOf('`', i + 1)
      if (end > i) {
        found.push(command.slice(i + 1, end))
        i = end
      }
      continue
    }
    if (ch === '(') {
      let depth = 1
      let j = i + 1
      for (; j < command.length && depth > 0; j += 1) {
        if (command[j] === '(') depth += 1
        if (command[j] === ')') depth -= 1
      }
      if (depth === 0) found.push(command.slice(i + 1, j - 1))
      i = j - 1
    }
  }
  return found
}

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=(?:"(?:[^"\\]|\\.)*"|'[^']*'|[^\s"'])*\s+/
const WRAPPER = /^(?:timeout\s+\S+|time|nice(?:\s+-n\s+\S+)?|nohup|stdbuf(?:\s+-\S+)*|command|builtin|noglob|xargs)\s+/

/** Each form of a subcommand that a deny or ask rule may match. */
function forms(subcommand: string): string[] {
  const result = [subcommand]
  let rest = subcommand
  for (;;) {
    const match = ASSIGNMENT.exec(rest) ?? WRAPPER.exec(rest)
    if (match === null) break
    rest = rest.slice(match[0].length)
    result.push(rest)
  }
  return result
}

export function subcommands(command: string, tool: 'Bash' | 'PowerShell'): string[] {
  const operators =
    tool === 'Bash' ? ['&&', '||', '|&', ';', '|', '&', '\n'] : ['&&', '||', ';', '|', '\n']
  const all: string[] = []
  const visit = (text: string): void => {
    for (const part of splitTopLevel(text, operators)) {
      all.push(part)
      for (const inner of nested(part)) visit(inner)
    }
  }
  visit(command)
  return all
}

const GLOB_TOKEN = /\*\*\/|\/\*\*$|\*\*|\*|\?|[^*?]+/g

function globSource(pattern: string): string {
  let source = ''
  for (const token of pattern.match(GLOB_TOKEN) ?? []) {
    if (token === '**/') source += '(?:.*/)?'
    else if (token === '/**') source += '/.*'
    else if (token === '**') source += '.*'
    else if (token === '*') source += '[^/]*'
    else if (token === '?') source += '[^/]'
    else source += escapeRegExp(token)
  }
  return source
}

/** Matches an Edit rule's pattern against a path relative to the project root. */
export function editPatternMatches(pattern: string, relativePath: string, kind: RuleKind): boolean {
  if (pattern.startsWith('//') || pattern.startsWith('~/')) return false
  let rule = pattern
  let anchored = false
  if (rule.startsWith('/')) {
    rule = rule.slice(1)
    anchored = true
  } else if (rule.startsWith('./')) {
    rule = rule.slice(2)
  }
  const segments = rule.split('/')
  const anyDepth =
    !anchored && (!rule.includes('/') || (kind !== 'allow' && segments.length === 2 && segments[1] === '**'))
  const source = `${anyDepth ? '(?:.*/)?' : ''}${globSource(rule)}`
  return new RegExp(`^${source}$`).test(relativePath)
}

function ruleMatches(rule: Rule, call: Call, kind: RuleKind): boolean {
  if ('command' in call) {
    if (!toolMatches(rule.tool, call.tool)) return false
    if (rule.content === undefined || rule.content === '*') return true
    const content = rule.content
    const ignoreCase = call.tool === 'PowerShell'
    return subcommands(call.command, call.tool)
      .flatMap(forms)
      .some((form) => shellPatternMatches(content, form, ignoreCase))
  }
  if ('path' in call) {
    if (rule.content === undefined) return toolMatches(rule.tool, call.tool)
    if (rule.tool !== 'Edit') return false
    return editPatternMatches(rule.content, call.path, kind)
  }
  return rule.content === undefined && toolMatches(rule.tool, call.tool)
}

/** The rules from a list that match a call. */
export function matchingRules(rules: readonly string[], call: Call, kind: RuleKind): string[] {
  return rules.filter((rule) => ruleMatches(parseRule(rule), call, kind))
}

/**
 * Whether a hooks matcher covers a tool: "*", "" or none cover all, plain
 * names separated by | or , match exactly, and anything else is a regex.
 */
export function hookMatcherCovers(matcher: unknown, tool: string): boolean {
  if (matcher === undefined || matcher === null || matcher === '' || matcher === '*') return true
  if (typeof matcher !== 'string') return false
  if (/^[A-Za-z0-9_|,-]+$/.test(matcher)) return matcher.split(/[|,]/).includes(tool)
  return new RegExp(matcher).test(tool)
}
