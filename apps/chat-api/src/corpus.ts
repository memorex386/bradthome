import { z } from 'zod'

// The corpus the API answers from (S6.6): live's /corpus.json, version 1, in
// the shape spec 020's corpusSchema builds. It's restated here because the
// site's schema imports Astro's own zod, which the API's bundle can't carry.
// Spec 021's tests parse the real corpus with it.

const source = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum(['claim', 'job', 'project', 'essay']),
  label: z.string().regex(/^(Résumé|Essay) · .+/),
  text: z.string().min(1),
  url: z.url({ protocol: /^https$/ }).startsWith('https://bradthome.com/'),
  evidence: z.array(z.url({ protocol: /^https$/ })),
})

export const corpusSchema = z.strictObject({
  version: z.literal(1),
  name: z.literal('Brad Thome'),
  about: z.string().min(1),
  site: z.literal('https://bradthome.com'),
  contact: z.literal('brad@bradthome.com'),
  essay: z.strictObject({
    title: z.string().min(1),
    url: z.literal('https://bradthome.com/vindecoded-agents'),
    author: z.literal('Brad Thome'),
  }),
  sources: z.array(source).min(1),
})

export type Corpus = z.infer<typeof corpusSchema>
export type Source = Corpus['sources'][number]

/** The corpus, or a throw, so the API never starts on a corpus it can't trust. */
export function parseCorpus(input: unknown): Corpus {
  const corpus = corpusSchema.parse(input)
  if (new Set(corpus.sources.map((s) => s.id)).size !== corpus.sources.length) throw new Error('The corpus repeats a source ID.')
  return corpus
}
