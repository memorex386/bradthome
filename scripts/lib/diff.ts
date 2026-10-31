// Reads the lines a unified diff adds, with their files and line numbers, so
// the term check covers exactly what a change brings in. Binary files show no
// lines, so they're never scanned (FR-006).

export interface AddedLine {
  file: string
  /** The 1-based line in the new file. */
  line: number
  text: string
}

/** Reads a path git quoted the C way, as it does for unusual characters. */
function unquote(path: string): string {
  if (!path.startsWith('"') || !path.endsWith('"')) return path
  const bytes: number[] = []
  const body = path.slice(1, -1)
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i] ?? ''
    if (ch !== '\\') {
      bytes.push(...Buffer.from(ch, 'utf8'))
      continue
    }
    const next = body[i + 1] ?? ''
    if (/[0-7]/.test(next)) {
      bytes.push(Number.parseInt(body.slice(i + 1, i + 4), 8))
      i += 3
      continue
    }
    const escapes: Record<string, string> = { n: '\n', t: '\t', '"': '"', '\\': '\\', a: '\x07', b: '\b', f: '\f', r: '\r', v: '\v' }
    bytes.push(...Buffer.from(escapes[next] ?? next, 'utf8'))
    i += 1
  }
  return Buffer.from(bytes).toString('utf8')
}

/** The lines a patch adds. Pass git diff output made with --src-prefix=a/ --dst-prefix=b/. */
export function addedLines(patch: string): AddedLine[] {
  const added: AddedLine[] = []
  let file: string | undefined
  let inHunk = false
  let line = 0
  for (const text of patch.split('\n')) {
    if (text.startsWith('diff --git ')) {
      file = undefined
      inHunk = false
      continue
    }
    if (!inHunk) {
      if (text.startsWith('+++ ')) {
        const target = text.slice(4).replace(/\t$/, '')
        file = target === '/dev/null' ? undefined : unquote(target).replace(/^b\//, '')
        continue
      }
      if (!text.startsWith('@@')) continue
    }
    if (text.startsWith('@@')) {
      inHunk = true
      line = Number(/^@@+ (?:-\d+(?:,\d+)? )+\+(\d+)/.exec(text)?.[1] ?? '0')
      continue
    }
    if (text.startsWith('+')) {
      if (file !== undefined) added.push({ file, line, text: text.slice(1).replace(/\r$/, '') })
      line += 1
    } else if (text.startsWith(' ')) {
      line += 1
    }
  }
  return added
}
