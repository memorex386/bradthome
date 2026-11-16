import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseResults } from '../../../../evals/src/results.ts'
import { repoRootOf } from '../home/record.ts'
import { altOf, type Card, type CardId, cardFor, essayCardOf, evalsCardOf, HEIGHT, heroCardOf, urlOf, WIDTH } from './share.ts'

// Reads each share card's words and data at build time (spec 039): the hero's
// words and tiles, with their years for the build's day; the essay's MDX and
// its diagram's component; and the latest full eval run, as /evals shows it.
// The files are read from the checkout the build runs in, as /evals reads its
// run's, never imported: both layouts call this, and an import of the essay or
// its diagram would join their modules to every page's, which reorders the
// pages' styles.

/** A file in the checkout the site is built from. */
const read = (...parts: string[]): string => readFileSync(path.join(repoRootOf(process.cwd()), ...parts), 'utf8')

/** A card, built for a day: the build's, by default, as the hero counts its years (D224). */
export function cardOf(id: CardId, day: Date = new Date()): Card {
  if (id === 'vindecoded-agents')
    return essayCardOf(
      read('apps', 'site', 'src', 'pages', 'vindecoded-agents.mdx'),
      read('apps', 'site', 'src', 'components', 'SystemDiagram.astro'),
    )
  if (id === 'evals') return evalsCardOf(parseResults(JSON.parse(read('apps', 'evals', 'results.json'))))
  return heroCardOf(id === 'home' ? 'all' : id, day)
}

/** The picture a page's share tags give: its own card, or the home's, with its size and words (FR-004). */
export interface ShareImage {
  url: string
  width: number
  height: number
  alt: string
}

export function shareImageOf(pathname: string): ShareImage {
  const id = cardFor(pathname)
  return { url: urlOf(id), width: WIDTH, height: HEIGHT, alt: altOf(cardOf(id)) }
}
