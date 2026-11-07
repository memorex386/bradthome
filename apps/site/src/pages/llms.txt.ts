import type { APIRoute } from 'astro'
import { llmsOf } from '../corpus/corpus.ts'
import { loadCorpus } from '../corpus/build.ts'

// /llms.txt: the same corpus in llmstxt.org's format (spec 020, D180).
export const GET: APIRoute = async () => {
  const { corpus } = await loadCorpus()
  return new Response(llmsOf(corpus), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
