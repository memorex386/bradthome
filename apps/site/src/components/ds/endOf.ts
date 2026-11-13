// A claim's text split before its last word (spec 038), so its sparkle can
// keep to that word and never wrap alone onto a line of its own.

export function endOf(text: string): { head: string; last: string } {
  const trimmed = text.trimEnd()
  const at = trimmed.lastIndexOf(' ')
  return at < 0 ? { head: '', last: trimmed } : { head: trimmed.slice(0, at + 1), last: trimmed.slice(at + 1) }
}
