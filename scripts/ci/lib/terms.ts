import { envValue, parseTerms, type Terms, VARIABLE } from '../../lib/terms.ts'

// The private-term list for the jobs that print text from the pull request:
// commits, secrets, hygiene and lock (D87). They print through the output
// gate, so a subject, title or path that holds a term is hidden, as the hooks
// hide it. Only the privacy job fails without the list (K6). Without it, these
// jobs have nothing to hide by, and the privacy job fails the run.

/** The list from the PRIVATE_TERMS secret, or undefined when it's missing or empty. */
export function termsFromSecret(env: NodeJS.ProcessEnv = process.env): Terms | undefined {
  const list = envValue(env, VARIABLE)
  if (list === undefined) return undefined
  const terms = parseTerms(list)
  return terms.count === 0 ? undefined : terms
}
