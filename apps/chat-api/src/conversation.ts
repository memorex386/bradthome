// The conversation's cap (spec 045, D252), apart from constants.ts: the page's
// one module reads the API's origin from constants.ts and carries its every
// setting, so a new one there would grow it (spec 045's S6.2). The API and the
// window both read this one.

/** The whole conversation's text, in characters: about 3,000 tokens, so an answer's input stays small. */
export const MAX_CONVERSATION_CHARS = 12_000
