// Reads a shell command the way the guards need it: each simple command's
// words with their quotes removed, the variables set in front of it, and the
// variables a statement such as export or $env: sets for what follows. It
// reads bash and PowerShell. Nested commands, in $( … ), backticks, subshells,
// script blocks, bash -c and eval, are read too.
//
// It reads text, not a running shell, so a variable's value or an alias is
// unknown to it (D73 accepts that limit).

export type Shell = 'bash' | 'powershell'

export interface SimpleCommand {
  /** The words, quotes removed, after any assignments and wrappers. */
  words: string[]
  /** Variables set for this command alone, as in HUSKY=0 git commit. */
  assignments: Map<string, string>
  /** Variables set earlier on the line by export, $env: and the like, still in force. */
  env: Map<string, string>
  /** The text of any here-document fed to the command. */
  input: string
  shell: Shell
}

export interface Parsed {
  commands: SimpleCommand[]
  /** Every variable a statement sets for what follows, in order. */
  exports: { name: string; value: string }[]
}

type Token = { kind: 'word'; value: string } | { kind: 'op'; value: string } | { kind: 'heredoc'; value: string }

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/
const BASH_OPERATORS = ['&&', '||', '|&', ';;', ';', '|', '&', '(', ')', '\n']
const POWERSHELL_OPERATORS = ['&&', '||', ';', '|', '\n']

/** The text from an opening bracket to its match, minding quotes. Returns the inside and the index after the match. */
function readBalanced(text: string, from: number, open: string, close: string): { inner: string; end: number } {
  let depth = 1
  let quote: string | undefined
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i] ?? ''
    if (quote !== undefined) {
      if (ch === '\\' && quote === '"') i += 1
      else if (ch === quote) quote = undefined
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '\\') i += 1
    else if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return { inner: text.slice(from, i), end: i + 1 }
    }
  }
  return { inner: text.slice(from), end: text.length }
}

function tokenizeBash(text: string, nested: string[]): Token[] {
  const tokens: Token[] = []
  let word = ''
  let inWord = false
  const heredocs: { delimiter: string; strip: boolean }[] = []
  const end = (): void => {
    if (inWord) tokens.push({ kind: 'word', value: word })
    word = ''
    inWord = false
  }
  let i = 0
  while (i < text.length) {
    const ch = text[i] ?? ''
    if (ch === '\\') {
      if (text[i + 1] === '\n') {
        i += 2
        continue
      }
      word += text[i + 1] ?? ''
      inWord = true
      i += 2
      continue
    }
    if (ch === "'") {
      const close = text.indexOf("'", i + 1)
      const stop = close < 0 ? text.length : close
      word += text.slice(i + 1, stop)
      inWord = true
      i = stop + 1
      continue
    }
    if (ch === '$' && text[i + 1] === "'") {
      let j = i + 2
      let value = ''
      for (; j < text.length && text[j] !== "'"; j += 1) {
        if (text[j] === '\\') {
          j += 1
          const escaped: Record<string, string> = { n: '\n', t: '\t', "'": "'", '\\': '\\' }
          value += escaped[text[j] ?? ''] ?? text[j] ?? ''
        } else value += text[j]
      }
      word += value
      inWord = true
      i = j + 1
      continue
    }
    if (ch === '"') {
      let j = i + 1
      for (; j < text.length && text[j] !== '"'; j += 1) {
        const c = text[j] ?? ''
        if (c === '\\' && '"\\$`\n'.includes(text[j + 1] ?? '')) {
          if (text[j + 1] !== '\n') word += text[j + 1]
          j += 1
        } else if (c === '$' && text[j + 1] === '(') {
          const { inner, end: after } = readBalanced(text, j + 2, '(', ')')
          nested.push(inner)
          word += `$(${inner})`
          j = after - 1
        } else if (c === '`') {
          const close = text.indexOf('`', j + 1)
          const stop = close < 0 ? text.length : close
          nested.push(text.slice(j + 1, stop))
          j = stop
        } else word += c
      }
      inWord = true
      i = j + 1
      continue
    }
    if (ch === '`') {
      const close = text.indexOf('`', i + 1)
      const stop = close < 0 ? text.length : close
      nested.push(text.slice(i + 1, stop))
      inWord = true
      i = stop + 1
      continue
    }
    if (ch === '$' && text[i + 1] === '(') {
      const { inner, end: after } = readBalanced(text, i + 2, '(', ')')
      nested.push(inner)
      word += `$(${inner})`
      inWord = true
      i = after
      continue
    }
    if ((ch === '<' || ch === '>') && text[i + 1] === '(') {
      end()
      const { inner, end: after } = readBalanced(text, i + 2, '(', ')')
      nested.push(inner)
      i = after
      continue
    }
    if (ch === '#' && !inWord) {
      while (i < text.length && text[i] !== '\n') i += 1
      continue
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      end()
      i += 1
      continue
    }
    // Redirections: an fd number, then the operator, then its target word.
    const redirect = /^(?:<<<|<<-?|>>|>\||<>|>&|<&|>|<|&>>?)/.exec(text.slice(i))
    if (redirect !== null) {
      // A number just before the operator is the fd it redirects, not a word.
      if (inWord && /^\d+$/.test(word)) {
        word = ''
        inWord = false
      }
      end()
      i += redirect[0].length
      while (text[i] === ' ' || text[i] === '\t') i += 1
      const target = /^(['"]?)([^\s;&|()<>'"]*)\1/.exec(text.slice(i))
      const operator = redirect[0]
      if ((operator === '<<' || operator === '<<-') && target !== null) {
        heredocs.push({ delimiter: target[2] ?? '', strip: operator === '<<-' })
      }
      i += target?.[0].length ?? 0
      continue
    }
    const operator = BASH_OPERATORS.find((op) => text.startsWith(op, i))
    if (operator !== undefined) {
      end()
      tokens.push({ kind: 'op', value: operator })
      i += operator.length
      if (operator === '\n') {
        for (const heredoc of heredocs.splice(0)) {
          const lines: string[] = []
          while (i < text.length) {
            const stop = text.indexOf('\n', i)
            const line = text.slice(i, stop < 0 ? text.length : stop)
            i = stop < 0 ? text.length : stop + 1
            if ((heredoc.strip ? line.replace(/^\t+/, '') : line) === heredoc.delimiter) break
            lines.push(line)
          }
          tokens.push({ kind: 'heredoc', value: lines.join('\n') })
        }
      }
      continue
    }
    word += ch
    inWord = true
    i += 1
  }
  end()
  return tokens
}

function tokenizePowerShell(text: string, nested: string[]): Token[] {
  const tokens: Token[] = []
  let word = ''
  let inWord = false
  const end = (): void => {
    if (inWord) tokens.push({ kind: 'word', value: word })
    word = ''
    inWord = false
  }
  let i = 0
  while (i < text.length) {
    const ch = text[i] ?? ''
    if (ch === '`') {
      if (text[i + 1] === '\n' || (text[i + 1] === '\r' && text[i + 2] === '\n')) {
        i += text[i + 1] === '\r' ? 3 : 2
        continue
      }
      word += text[i + 1] ?? ''
      inWord = true
      i += 2
      continue
    }
    if (ch === '@' && (text[i + 1] === "'" || text[i + 1] === '"') && /^\r?\n/.test(text.slice(i + 2))) {
      const close = text.indexOf(`\n${text[i + 1]}@`, i + 2)
      const stop = close < 0 ? text.length : close
      const body = text.slice(text.indexOf('\n', i) + 1, stop)
      if (text[i + 1] === '"') for (const match of body.matchAll(/\$\(([^()]*)\)/g)) nested.push(match[1] ?? '')
      word += body
      inWord = true
      i = close < 0 ? text.length : stop + 3
      continue
    }
    if (ch === "'") {
      let j = i + 1
      for (; j < text.length; j += 1) {
        if (text[j] === "'" && text[j + 1] === "'") {
          word += "'"
          j += 1
        } else if (text[j] === "'") break
        else word += text[j]
      }
      inWord = true
      i = j + 1
      continue
    }
    if (ch === '"') {
      let j = i + 1
      for (; j < text.length && text[j] !== '"'; j += 1) {
        const c = text[j] ?? ''
        if (c === '`') {
          word += text[j + 1] ?? ''
          j += 1
        } else if (c === '$' && text[j + 1] === '(') {
          const { inner, end: after } = readBalanced(text, j + 2, '(', ')')
          nested.push(inner)
          word += `$(${inner})`
          j = after - 1
        } else word += c
      }
      inWord = true
      i = j + 1
      continue
    }
    if (ch === '$' && text[i + 1] === '(') {
      const { inner, end: after } = readBalanced(text, i + 2, '(', ')')
      nested.push(inner)
      word += `$(${inner})`
      inWord = true
      i = after
      continue
    }
    if ((ch === '{' || ch === '(') && !inWord) {
      const { inner, end: after } = readBalanced(text, i + 1, ch, ch === '{' ? '}' : ')')
      nested.push(inner)
      i = after
      continue
    }
    if (ch === '<' && text[i + 1] === '#') {
      const close = text.indexOf('#>', i + 2)
      i = close < 0 ? text.length : close + 2
      continue
    }
    if (ch === '#' && !inWord) {
      while (i < text.length && text[i] !== '\n') i += 1
      continue
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      end()
      i += 1
      continue
    }
    const operator = POWERSHELL_OPERATORS.find((op) => text.startsWith(op, i))
    if (operator !== undefined) {
      end()
      tokens.push({ kind: 'op', value: operator })
      i += operator.length
      continue
    }
    word += ch
    inWord = true
    i += 1
  }
  end()
  return tokens
}

const KEYWORDS = new Set(['if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', '{', 'time'])
const ENDINGS = new Set(['fi', 'done', 'esac', '}', 'then', 'else', 'do'])
const HEADERS = new Set(['for', 'select', 'case', 'function'])

/** Wrappers that run the command after them, with how many option values they take. */
function unwrap(words: string[], assignments: Map<string, string>): string[] {
  let rest = words
  for (;;) {
    const name = (rest[0] ?? '').toLowerCase().replace(/\.exe$/, '')
    if (name === 'env') {
      let i = 1
      for (; i < rest.length; i += 1) {
        const word = rest[i] ?? ''
        const eq = word.indexOf('=')
        if (word === '-u' || word === '--unset' || word === '-C' || word === '--chdir') i += 1
        else if (word.startsWith('-')) continue
        else if (eq > 0 && NAME.test(word.slice(0, eq))) assignments.set(word.slice(0, eq), word.slice(eq + 1))
        else break
      }
      rest = rest.slice(i)
    } else if (['command', 'builtin', 'exec', 'nohup', 'time', 'noglob', 'sudo', 'doas', 'cross-env'].includes(name)) {
      let i = 1
      while (i < rest.length && (rest[i] ?? '').startsWith('-')) i += 1
      for (; i < rest.length && name === 'cross-env'; i += 1) {
        const word = rest[i] ?? ''
        const eq = word.indexOf('=')
        if (eq > 0 && NAME.test(word.slice(0, eq))) assignments.set(word.slice(0, eq), word.slice(eq + 1))
        else break
      }
      rest = rest.slice(i)
    } else if (name === 'nice' || name === 'stdbuf' || name === 'xargs') {
      let i = 1
      while (i < rest.length && (rest[i] ?? '').startsWith('-')) i += /^-[nIiLPs]$/.test(rest[i] ?? '') ? 2 : 1
      rest = rest.slice(i)
    } else if (name === 'timeout') {
      let i = 1
      while (i < rest.length && (rest[i] ?? '').startsWith('-')) i += /^-[sk]$/.test(rest[i] ?? '') ? 2 : 1
      rest = rest.slice(i + 1)
    } else return rest
    if (rest.length === 0) return rest
  }
}

/** Reads a command into its simple commands. */
export function parseCommand(text: string, shell: Shell, depth = 0): Parsed {
  const nested: string[] = []
  const tokens = shell === 'bash' ? tokenizeBash(text, nested) : tokenizePowerShell(text, nested)
  const parsed: Parsed = { commands: [], exports: [] }
  const env = new Map<string, string>()
  let words: string[] = []
  let input = ''

  const setExport = (name: string, value: string): void => {
    env.set(name, value)
    parsed.exports.push({ name, value })
  }

  const finish = (): void => {
    let rest = words
    words = []
    const assignments = new Map<string, string>()
    if (shell === 'bash') {
      while (rest.length > 0) {
        const first = rest[0] ?? ''
        const eq = first.indexOf('=')
        if (eq > 0 && NAME.test(first.slice(0, eq))) {
          assignments.set(first.slice(0, eq), first.slice(eq + 1))
          rest = rest.slice(1)
        } else if (KEYWORDS.has(first)) rest = rest.slice(1)
        else break
      }
      if (rest.length === 0) {
        // A line of bare assignments sets shell variables for what follows.
        for (const [name, value] of assignments) setExport(name, value)
        input = ''
        return
      }
      if (HEADERS.has(rest[0] ?? '') || (rest.length === 1 && ENDINGS.has(rest[0] ?? ''))) {
        input = ''
        return
      }
      const head = rest[0] ?? ''
      if (['export', 'declare', 'typeset', 'local', 'readonly'].includes(head)) {
        for (const word of rest.slice(1)) {
          const eq = word.indexOf('=')
          if (eq > 0 && NAME.test(word.slice(0, eq))) setExport(word.slice(0, eq), word.slice(eq + 1))
        }
      }
    } else {
      // PowerShell: $env:NAME = value, or $env:NAME='value' as one word.
      const first = rest[0] ?? ''
      const assign = /^\$env:([A-Za-z_][A-Za-z0-9_]*)(\+?=)(.*)$/i.exec(first)
      if (assign !== null) {
        setExport(assign[1] ?? '', `${assign[3] ?? ''}${rest.slice(1).join(' ')}`)
        input = ''
        return
      }
      if (/^\$env:[A-Za-z_][A-Za-z0-9_]*$/i.test(first) && /^\+?=$/.test(rest[1] ?? '')) {
        setExport(first.slice(5), rest.slice(2).join(' '))
        input = ''
        return
      }
      if (rest[0] === '&' || rest[0] === '.') rest = rest.slice(1)
      const set = /^(?:set-item|si|set-content|sc|new-item|ni)$/i.test(rest[0] ?? '')
      if (set) {
        const target = rest.slice(1).find((word) => /^env:/i.test(word))
        if (target !== undefined) {
          const valueAt = rest.findIndex((word) => /^-value$/i.test(word))
          const value = valueAt >= 0 ? (rest[valueAt + 1] ?? '') : (rest[rest.indexOf(target) + 1] ?? '')
          setExport(target.slice(4), value)
        }
      }
    }
    const unwrapped = unwrap(rest, assignments)
    if (unwrapped.length > 0) {
      parsed.commands.push({ words: unwrapped, assignments, env: new Map(env), input, shell })
      const name = (unwrapped[0] ?? '').toLowerCase().replace(/\.exe$/, '')
      if (depth < 5) {
        // bash -c '…', sh -c, eval, pwsh -Command and the like run their text as a command.
        let inner: { text: string; shell: Shell } | undefined
        if (['bash', 'sh', 'zsh', 'dash', 'ksh'].includes(name)) {
          const at = unwrapped.findIndex((word, index) => index > 0 && /^-[a-z]*c[a-z]*$/.test(word))
          if (at > 0 && unwrapped[at + 1] !== undefined) inner = { text: unwrapped[at + 1] ?? '', shell: 'bash' }
        } else if (name === 'eval') inner = { text: unwrapped.slice(1).join(' '), shell: 'bash' }
        else if (['pwsh', 'powershell', 'invoke-expression', 'iex'].includes(name)) {
          const at = unwrapped.findIndex((word, index) => index > 0 && /^-(?:c|command|encodedcommand)$/i.test(word))
          const text = at > 0 ? unwrapped.slice(at + 1).join(' ') : name === 'pwsh' || name === 'powershell' ? '' : unwrapped.slice(1).join(' ')
          if (text !== '') inner = { text, shell: 'powershell' }
        }
        if (inner !== undefined) {
          const result = parseCommand(inner.text, inner.shell, depth + 1)
          parsed.commands.push(...result.commands)
          parsed.exports.push(...result.exports)
        }
      }
    }
    input = ''
  }

  for (const token of tokens) {
    if (token.kind === 'word') words.push(token.value)
    else if (token.kind === 'heredoc') {
      // A here-document's body follows the line its command is on, so it
      // belongs to that line's last command: what a pipe feeds.
      const last = parsed.commands.at(-1)
      if (words.length === 0 && last !== undefined) last.input = last.input === '' ? token.value : `${last.input}\n${token.value}`
      else input = input === '' ? token.value : `${input}\n${token.value}`
    } else finish()
  }
  finish()
  if (depth < 5) {
    for (const inner of nested) {
      const result = parseCommand(inner, shell, depth + 1)
      parsed.commands.push(...result.commands)
      parsed.exports.push(...result.exports)
    }
  }
  return parsed
}

/** A command's name: its first word's file name, in lower case, without .exe. */
export function commandName(command: SimpleCommand): string {
  const first = (command.words[0] ?? '').replaceAll('\\', '/')
  return (first.split('/').at(-1) ?? '').toLowerCase().replace(/\.(?:exe|cmd|bat|ps1)$/, '')
}

/** A variable's value for a command: set in front of it, or earlier on the line. Case doesn't matter on Windows or in PowerShell. */
export function variable(command: SimpleCommand, name: string): string | undefined {
  const fold = command.shell === 'powershell' || process.platform === 'win32'
  for (const map of [command.assignments, command.env]) {
    for (const [key, value] of map) if (key === name || (fold && key.toLowerCase() === name.toLowerCase())) return value
  }
  return undefined
}
