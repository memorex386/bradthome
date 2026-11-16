import essay from '../../pages/vindecoded-agents.mdx?raw'
import diagram from '../SystemDiagram.astro?raw'
import raw from '../../../../evals/results.json'
import { parseResults } from '../../../../evals/src/results.ts'
import { altOf, type Card, type CardId, cardFor, essayCardOf, evalsCardOf, HEIGHT, heroCardOf, urlOf, WIDTH } from './share.ts'

// Reads each share card's words and data at build time (spec 039): the hero's
// words and tiles, with their years for the build's day; the essay's MDX and
// its diagram's component; and the latest full eval run, as /evals shows it.

/** A card, built for a day: the build's, by default, as the hero counts its years (D224). */
export function cardOf(id: CardId, day: Date = new Date()): Card {
  if (id === 'vindecoded-agents') return essayCardOf(essay, diagram)
  if (id === 'evals') return evalsCardOf(parseResults(raw))
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
