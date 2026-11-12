import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { type CorpusInput, corpusOf } from '../../site/src/corpus/corpus.ts'
import { essayTitleOf } from '../../site/src/corpus/essay.ts'
import { type Corpus, parseCorpus } from '../../chat-api/src/corpus.ts'

// The corpus the evals ask about (spec 023): built from this commit's content
// with spec 020's corpusOf, the same function that builds /corpus.json, then
// checked with the API's own schema. Plain Node, so no site build is needed.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

export function loadCorpus(root: string = ROOT): Corpus {
  const site = path.join(root, 'apps', 'site')
  const content = path.join(site, 'content')
  const folder = (name: string) =>
    readdirSync(path.join(content, name))
      .filter((file) => file.endsWith('.yaml'))
      .sort()
      .map((file) => ({ id: file.slice(0, -'.yaml'.length), ...(parse(readFileSync(path.join(content, name, file), 'utf8')) as object) }))
  const essay = readFileSync(path.join(site, 'src', 'pages', 'vindecoded-agents.mdx'), 'utf8')
  const claims = Object.entries(parse(readFileSync(path.join(content, 'claims.yaml'), 'utf8')) as Record<string, object>).map(
    ([id, claim]) => ({ id, ...claim }),
  )
  const built = corpusOf({
    jobs: folder('jobs'),
    projects: folder('projects'),
    career: folder('career'),
    claims,
    essay: { title: essayTitleOf(essay), source: essay },
  } as unknown as CorpusInput)
  return parseCorpus(JSON.parse(JSON.stringify(built)) as unknown)
}
