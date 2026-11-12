import { getCollection } from 'astro:content'
import essay from '../pages/vindecoded-agents.mdx?raw'
import { type Corpus, corpusOf } from './corpus.ts'
import { essayTitleOf } from './essay.ts'

// Reads the content collections and the essay for /corpus.json and /llms.txt
// (spec 020). The collections' schema has already refused any claim that
// isn't public (spec 005); corpusOf checks again, so the corpus never depends
// on one check alone.

export async function loadCorpus(): Promise<{ corpus: Corpus }> {
  const jobs = (await getCollection('jobs')).map((entry) => ({ id: entry.id, ...entry.data }))
  const projects = (await getCollection('projects')).map((entry) => ({ id: entry.id, ...entry.data }))
  const career = (await getCollection('career')).map((entry) => ({ id: entry.id, ...entry.data }))
  const claims = (await getCollection('claims')).map((entry) => ({ id: entry.id, ...entry.data }))
  const essayTitle = essayTitleOf(essay)
  return { corpus: corpusOf({ jobs, projects, career, claims, essay: { title: essayTitle, source: essay } }) }
}
