import type { APIRoute } from 'astro'
import { jsonOf } from '../corpus/corpus.ts'
import { loadCorpus } from '../corpus/build.ts'

// /corpus.json: the public corpus that "Ask about Brad" reads (spec 020, D174).
export const GET: APIRoute = async () => {
  const { corpus } = await loadCorpus()
  return new Response(jsonOf(corpus), { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}
