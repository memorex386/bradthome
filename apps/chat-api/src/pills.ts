import { withName } from './pronouns.ts'

// The three questions under each answer (spec 045, D250). The model writes
// them after its answer, between <next> tags, and the API cuts them off the
// stream, checks each one in code and fills any gap from the starters, so the
// browser only ever sees questions that passed (FR-004–FR-007).

/** The starters on the empty chat (spec 022's A2), which also fill the pills. Each sends itself as the question. */
export const STARTERS = [
  'How does Brad ship with AI agents?',
  'What AI features has Brad shipped?',
  'What did Brad build at Hopper?',
  'Walk me through Brad’s career',
] as const

/**
 * What fills a gap after the starters, from the questions Brad saw in the
 * study. With the starters, there are eight, so three are always left: the
 * API sees at most five of the visitor's questions (MAX_MESSAGES).
 */
export const FALLBACKS = [
  ...STARTERS,
  'What role is Brad looking for?',
  'How was this site built?',
  'What’s VINDecoded?',
  'What did Brad do at Bleacher Report?',
] as const

/** How many pills follow each answer. */
export const PILLS = 3
/** The longest pill, in characters. */
export const MAX_PILL_CHARS = 60
/** The most of the trailer the API reads, in characters; the rest is dropped. */
export const MAX_TRAILER_CHARS = 400

export const OPEN = '<next>'
export const CLOSE = '</next>'

/**
 * Splits a streamed reply into the answer and the trailer. Everything from
 * <next> on is the trailer, and never reaches the answer. While the text ends
 * with what could be the start of the tag, it's held back.
 */
export function createTrailerSplitter(): { push(delta: string): string; flush(): string; trailer(): string } {
  let held = ''
  let trailer: string | undefined
  return {
    push(delta) {
      if (trailer !== undefined) {
        trailer = (trailer + delta).slice(0, MAX_TRAILER_CHARS)
        return ''
      }
      const text = held + delta
      const at = text.indexOf(OPEN)
      if (at !== -1) {
        held = ''
        trailer = text.slice(at + OPEN.length).slice(0, MAX_TRAILER_CHARS)
        return text.slice(0, at)
      }
      const keep = partialTagAt(text)
      held = text.slice(keep)
      return text.slice(0, keep)
    },
    flush() {
      const rest = trailer === undefined ? held : ''
      held = ''
      return rest
    },
    trailer: () => trailer ?? '',
  }
}

/** Where a trailing piece of text that could still grow into <next> starts. */
function partialTagAt(text: string): number {
  for (let length = Math.min(OPEN.length - 1, text.length); length > 0; length--) {
    if (OPEN.startsWith(text.slice(text.length - length))) return text.length - length
  }
  return text.length
}

/** The trailer's questions, one a line, before </next>. */
export function linesOf(trailer: string): string[] {
  const end = trailer.indexOf(CLOSE)
  return (end === -1 ? trailer : trailer.slice(0, end))
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line !== '')
}

/** A question's words, for telling repeats apart: lowercase letters and digits, with Brad's name restored. */
export const keyOf = (question: string): string =>
  withName(question)
    .toLowerCase()
    .replaceAll('’', "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()

const PHONE = /(?:\+?\d[\s().-]*){7,}/
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const LINK = /\bhttps?:\/\/|\bwww\.|\b[\w-]+\.(?:com|net|org|io|dev|app|ai|co)\b/i
/** A pill asks about Brad in the third person: never “I”, “me”, “you” or a pronoun for Brad. */
const PRONOUN = /\b(?:i|i['’]m|i['’]d|i['’]ve|me|my|mine|you|you['’]re|your|yours|he|him|his|himself|she|her|hers)\b/i
/** The boundary's topics (rule 6), which Brad answers by email. */
const BOUNDARY_TOPIC =
  /\b(?:salary|salaries|pay|paid|compensation|comp|rates?|hourly|equity|bonus|available|availability|start(?:ing)? date|notice|references?|relocat\w*)\b|\b(?:can|could|would|will|when (?:can|could|would|will)) brad (?:start|join|begin)\b/i
/** A private detail (rule 5), which the site never holds. */
const PRIVATE_TOPIC =
  /\b(?:phone|cell|address|e-?mail|age|how old|birthday|married|wife|husband|spouse|kids|children|family|religion|politic\w*|health)\b/i
/** A request that the chat speak as Brad, or drop its rules. */
const ROLE_PLAY =
  /\b(?:pretend|role[- ]?play|act as|speak as|as if you|be brad|you are brad|first person|ignore|instructions|rules|prompt)\b/i

/**
 * Whether a pill may be shown: one short question, about Brad in the third
 * person, with no contact detail, link or boundary topic, and no name the
 * corpus doesn't hold, since the private-term list never ships with the API
 * (D27) and a made-up name leads nowhere.
 */
export function pillOk(pill: string, names: ReadonlySet<string>): boolean {
  if (pill.length === 0 || pill.length > MAX_PILL_CHARS) return false
  if (!pill.endsWith('?') || /[?!.]/.test(pill.slice(0, -1).replace(/\b(?:[A-Z]\.){2,}|\.(?=\w)/g, ''))) return false
  // The site's own name, bradthome.com, is a project in the corpus, not a link.
  if (PHONE.test(pill) || EMAIL.test(pill) || LINK.test(pill.replaceAll(/\bbradthome\.com\b/gi, ''))) return false
  if (PRONOUN.test(pill) || BOUNDARY_TOPIC.test(pill) || PRIVATE_TOPIC.test(pill) || ROLE_PLAY.test(pill)) return false
  return namesOf(pill).every((name) => names.has(name.toLowerCase()))
}

/** The names in a pill: each word past the first with a capital letter or a digit in it. */
export function namesOf(text: string): string[] {
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}’'&+-]*/gu) ?? []
  return words
    .slice(1)
    .filter((word) => /[\p{Lu}\p{N}]/u.test(word))
    .map((word) => word.replace(/[’']s$/, ''))
}

/** The words a pill may name: the corpus's own name, about line, labels and texts. */
export function namesOfCorpus(corpus: {
  name: string
  about: string
  sources: readonly { label: string; text: string }[]
}): ReadonlySet<string> {
  return vocabularyOf([corpus.name, corpus.about, ...corpus.sources.flatMap((source) => [source.label, source.text])])
}

/** Every word in the corpus, lowercase, so a pill's names can be checked against it. */
export function vocabularyOf(texts: readonly string[]): ReadonlySet<string> {
  const words = new Set<string>()
  for (const text of texts)
    for (const word of text.match(/[\p{L}\p{N}][\p{L}\p{N}’'&+-]*/gu) ?? []) words.add(word.toLowerCase().replace(/[’']s$/, ''))
  return words
}

export interface Pills {
  /** The three questions, in order: the model's that passed, then the fill. */
  pills: string[]
  /** How many of them the model wrote. */
  written: number
  /** How many the model wrote that the guard dropped. */
  dropped: number
}

/**
 * The pills for one answer: the trailer's questions, each through the
 * pronoun rewriter and the guard, never one already asked or shown, then the
 * fallbacks not yet asked, up to three.
 */
export function pillsOf(trailer: string, asked: readonly string[], names: ReadonlySet<string>): Pills {
  const seen = new Set(asked.map(keyOf))
  const pills: string[] = []
  let dropped = 0
  for (const line of linesOf(trailer)) {
    const pill = withName(line)
    if (pills.length >= PILLS) break
    if (!pillOk(pill, names) || seen.has(keyOf(pill))) {
      dropped++
      continue
    }
    seen.add(keyOf(pill))
    pills.push(pill)
  }
  const written = pills.length
  for (const fallback of FALLBACKS) {
    if (pills.length >= PILLS) break
    if (seen.has(keyOf(fallback))) continue
    seen.add(keyOf(fallback))
    pills.push(fallback)
  }
  return { pills, written, dropped }
}
