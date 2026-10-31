// A small reader for the YAML frontmatter that agents and skills start with.
// It reads `key: value` lines, and lists written inline or one item per line.

export type Frontmatter = Record<string, string | string[]>

function unquote(value: string): string {
  const trimmed = value.trim()
  if (/^(["']).*\1$/.test(trimmed)) return trimmed.slice(1, -1)
  return trimmed
}

export function readFrontmatter(text: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (match === null) return { data: {}, body: text }
  const data: Frontmatter = {}
  let listKey: string | undefined
  for (const line of (match[1] ?? '').split(/\r?\n/)) {
    const item = /^\s+-\s+(.+)$/.exec(line)
    if (item !== null && listKey !== undefined) {
      const list = data[listKey]
      data[listKey] = [...(Array.isArray(list) ? list : []), unquote(item[1] ?? '')]
      continue
    }
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line)
    if (pair === null) continue
    const key = pair[1] ?? ''
    const value = (pair[2] ?? '').trim()
    listKey = value === '' ? key : undefined
    data[key] = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1).split(',').map(unquote) : unquote(value)
  }
  return { data, body: text.slice(match[0].length) }
}

/** A frontmatter value as a list, splitting a comma-separated string. */
export function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  const items = Array.isArray(value) ? value : value.split(',')
  return items.map((item) => unquote(item)).filter((item) => item !== '')
}
