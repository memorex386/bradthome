// The chat calls Brad "Brad", never "he", "him" or "his" (spec 021's FR-008).
// The prompt asks for it, and the evals showed the model still slips about
// once in fifty answers (spec 023, D200). So the answer's words pass through
// this rewriter as they stream: each of those words becomes "Brad" or
// "Brad's". The chat only talks about Brad, so the words can only mean Brad.
// A word split across two chunks is held back until it's whole.

const PRONOUN = /\b(he|him|his|himself)\b/gi

const REPLACEMENT: Readonly<Record<string, string>> = {
  he: 'Brad',
  him: 'Brad',
  his: 'Brad’s',
  himself: 'Brad',
}

/** The text with each pronoun for Brad replaced by the name. */
export function withName(text: string): string {
  return text.replace(PRONOUN, (word) => REPLACEMENT[word.toLowerCase()] ?? word)
}

/** Where a word that may still be growing starts: the trailing run of letters. */
function tailStart(text: string): number {
  const match = /[A-Za-z]+$/.exec(text)
  return match === null ? text.length : match.index
}

/** A rewriter for a streamed answer: push each delta, then flush at the end. */
export function createPronounRewriter(): { push(delta: string): string; flush(): string } {
  let held = ''
  return {
    push(delta) {
      const text = held + delta
      const cut = tailStart(text)
      held = text.slice(cut)
      return withName(text.slice(0, cut))
    },
    flush() {
      const rest = withName(held)
      held = ''
      return rest
    },
  }
}
