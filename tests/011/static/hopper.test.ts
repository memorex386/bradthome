import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { anchorOf, ASK, askNameOf, hostOf, questionOf, SOURCES_LABEL, sourcesOf } from '../../../apps/site/src/components/ds/proof.ts'
import {
  eyebrowOf,
  HEADING,
  NOTE_TOPICS,
  QUOTE_TOPIC,
  RECEIPT_TITLES,
  ROLE_TOPIC,
  type StoryClaim,
  storyOf,
  TOPICS,
} from '../../../apps/site/src/components/home/hopper.ts'
import { SOURCE_LABELS } from '../../../apps/site/src/components/home/sources.ts'

// Spec 011's static checks: the Hopper story's layout rules on the real
// claims and on planted ones, its labels against the claims' words, and its
// files' rules (D129). Amended by spec 038 (D229, D230): each claim keeps its
// receipt's anchor and ends with a sparkle, and a card's sources show under
// its claims, in place of the numbered receipts and their drawers.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')

const FILES = {
  section: site('src', 'components', 'home', 'Hopper.astro'),
  claim: site('src', 'components', 'home', 'HopperClaim.astro'),
  data: site('src', 'components', 'home', 'hopper.ts'),
  css: site('src', 'styles', 'home', 'hopper.css'),
  // Spec 014: the home's page is the shared HomePage.astro.
  page: site('src', 'components', 'home', 'HomePage.astro'),
  claims: site('content', 'claims.yaml'),
  job: site('content', 'jobs', 'hopper.yaml'),
  plan: path.join(ROOT, 'docs', 'plan.md'),
  log: path.join(ROOT, 'docs', 'decisions', 'README.md'),
}

interface RawClaim {
  subject: string
  topic?: string
  order: number
  text: string
  evidence: string[]
  visibility: string
}

const allClaims = (): Record<string, RawClaim> => parse(read(FILES.claims)) as Record<string, RawClaim>
const hopperClaims = (): StoryClaim[] =>
  Object.entries(allClaims())
    .filter(([, claim]) => claim.subject === 'hopper')
    .map(([id, claim]) => ({ id, ...claim }))
/** The story's claims in reading order: the role, then each topic's. */
const readingOrder = (story: ReturnType<typeof storyOf>): string[] =>
  [...story.role, ...story.topics.flatMap((topic) => topic.items), ...story.quotes].map((item) => item.id)

const TOPIC_TITLES = [
  'Capital One Travel: Disruption Assistance',
  'The partner platform',
  'Fintech AI',
  'Human-approved agent workflow',
  'RemoteUI and WebViews',
]

/** The offer card's two sources' labels, on Brad's Gate 1 card for spec 038. */
const OFFER_SOURCES = ['The offer card, in a 2024 travel-blog post', 'Hopper Technology Solutions, March 2026']

/** The whole words of a text: lower case, split on anything but letters, digits and "+". */
const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter(Boolean)
/** Whether every word of a label is a whole word of the text. */
const holds = (text: string, label: string): string[] => {
  const known = new Set(words(text))
  return words(label).filter((word) => !known.has(word))
}

describe('the story from the real claims', () => {
  test('S2.1 S2.2 SC-002 FR-004 the role sits under the heading, then five topics, and every claim but the Stack note shows once, as written', () => {
    const claims = hopperClaims()
    const story = storyOf(claims)
    expect(story.role.map((item) => item.text)).toEqual(['Senior Software Engineer, remote.', 'Founding engineer on the Fintech AI team.'])
    expect(story.topics.map((topic) => topic.title)).toEqual(TOPIC_TITLES)
    expect(story.quotes).toEqual([])
    const shown = [...story.role, ...story.topics.flatMap((topic) => topic.items)]
    // Amended by spec 034 (D219): the Capital One card's offer-card claim and two mobile claims join the story.
    expect(shown).toHaveLength(15)
    const byId = new Map(claims.map((claim) => [claim.id, claim]))
    for (const item of shown) expect(item.text).toBe(byId.get(item.id)?.text)
    const left = claims.filter((claim) => !shown.some((item) => item.id === claim.id))
    expect(left.map((claim) => claim.topic)).toEqual(['Stack'])
    expect(NOTE_TOPICS).toEqual(['Stack'])
    expect(ROLE_TOPIC).toBe('Role and dates')
    expect(QUOTE_TOPIC).toBe('Quote')
  })

  test('S1.2 FR-004 each topic shows its claims in claim order', () => {
    const story = storyOf(hopperClaims())
    for (const topic of story.topics) {
      const orders = topic.items.map((item) => hopperClaims().find((claim) => claim.id === item.id)?.order ?? 0)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
    }
    // Amended by spec 034 (D219).
    expect(story.topics.map((topic) => topic.items.length)).toEqual([4, 3, 1, 1, 4])
  })

  // Amended by spec 038 (D229, D230): the claims have no numbers and no kinds. Each keeps its receipt's anchor and ends
  // with a sparkle named by its title, and the offer card's claim, the one Hopper claim with links (spec 034, D219),
  // lists them as the Capital One card's sources.
  test('S3.1 S3.2 FR-005 every claim, in reading order, keeps its anchor and its title, which names its sparkle, and only the offer card, the one Hopper claim with links, lists sources', () => {
    const claims = hopperClaims()
    const byId = new Map(claims.map((claim) => [claim.id, claim]))
    const story = storyOf(claims)
    const shown = [...story.role, ...story.topics.flatMap((topic) => topic.items)]
    expect(shown).toHaveLength(15)
    for (const item of shown) {
      const claim = byId.get(item.id)
      expect(item, item.id).toStrictEqual({ id: item.id, text: claim?.text, evidence: claim?.evidence, title: RECEIPT_TITLES[item.id] })
      expect(anchorOf(item.id)).toBe(`receipt-${item.id}`)
    }
    // The sparkles' names and questions tell the 15 apart.
    expect(new Set(shown.map((item) => askNameOf(item.title))).size).toBe(15)
    expect(new Set(shown.map((item) => questionOf(item.text))).size).toBe(15)
    expect(shown.filter((item) => item.evidence.length > 0).map((item) => item.id)).toEqual(['hopper-disruption-assistance-4'])
    const offer = byId.get('hopper-disruption-assistance-4')?.evidence ?? []
    expect(offer).toHaveLength(2)
    expect(story.topics.map((topic) => sourcesOf(topic.items, [], SOURCE_LABELS))).toEqual([
      offer.map((href, index) => ({
        href,
        label: OFFER_SOURCES[index],
        host: hostOf(href),
        outside: true,
        claim: 'hopper-disruption-assistance-4',
      })),
      [],
      [],
      [],
      [],
    ])
    expect(sourcesOf(story.role, [], SOURCE_LABELS)).toEqual([])
  })

  test('S2.1 S2.2 SC-001 no claim about another subject reaches the story, and every claim it reads is public', () => {
    const claims = allClaims()
    const ids = new Set(hopperClaims().map((claim) => claim.id))
    for (const [id, claim] of Object.entries(claims)) {
      expect(claim.visibility, id).toBe('public')
      if (!ids.has(id)) expect(claim.subject).not.toBe('hopper')
    }
    expect(read(FILES.section)).toMatch(/getCollection\('claims', \(entry\) => entry\.data\.subject === 'hopper'\)/)
  })
})

describe('the labels', () => {
  test("S2.3 FR-003 every tag uses only words from its topic's claims", () => {
    const story = storyOf(hopperClaims())
    for (const topic of story.topics) {
      expect(topic.tags.length, topic.name).toBeGreaterThan(0)
      const text = topic.items.map((item) => item.text.toLowerCase()).join(' ')
      for (const tag of topic.tags) expect(holds(text, tag), `${topic.name}: ${tag}`).toEqual([])
    }
  })

  test('S2.3 FR-003 the word check matches whole words, so an inflected or partial word fails', () => {
    expect(holds('Launched the flow.', 'launch')).toEqual(['launch'])
    expect(holds('Build it.', 'UI')).toEqual(['ui'])
    expect(holds("Capital One Travel's 10+ partner products, Terraform-provisioned", "Travel's 10+ Terraform")).toEqual([])
  })

  // Amended by spec 038 (D230): the titles name the claims' sparkles now, "Ask about this: {title}", and every claim shown has its own.
  test('S2.3 FR-003 every receipt title, which names its claim’s sparkle, uses only words from its own claim', () => {
    const claims = new Map(hopperClaims().map((claim) => [claim.id, claim.text.toLowerCase()]))
    for (const [id, title] of Object.entries(RECEIPT_TITLES)) {
      const text = claims.get(id)
      expect(text, id).toBeDefined()
      expect(holds(text ?? '', title), `${id}: ${title}`).toEqual([])
    }
    const story = storyOf(hopperClaims())
    for (const id of readingOrder(story)) expect(RECEIPT_TITLES[id], id).toBeDefined()
  })

  // Amended by spec 038 (D229, D230): the drawer's fixed words are gone. The sparkle's are fixed, and with no script it
  // still goes to the contact section; a card's sources sit under one label.
  test("S3.2 S3.3 FR-005 the sparkle's fixed words, and it goes to the contact section (spec 017, D153)", () => {
    expect(ASK).toEqual({ href: '#contact', tip: 'Ask about this' })
    expect(askNameOf('Senior Software Engineer')).toBe('Ask about this: Senior Software Engineer')
    expect(questionOf('Senior Software Engineer, remote.')).toBe('Tell me more about this: “Senior Software Engineer, remote.”')
    expect(SOURCES_LABEL).toBe('Sources')
    expect(HEADING).toBe('Fintech products for Hopper and its partners')
    expect(Object.keys(TOPICS)).toEqual([
      'Disruption Assistance',
      'Partner platform',
      'Fintech AI',
      'Agent and experimentation workflow',
      'Mobile: RemoteUI and WebViews',
    ])
  })

  test("S2.5 FR-002 the eyebrow's dates come from the Hopper job, and the build stops without the job or its claims", () => {
    const job = parse(read(FILES.job)) as { company: string; start: string; end: string }
    expect(eyebrowOf(job)).toBe('Experience · Hopper · Apr 2022 – Oct 2026')
    expect(eyebrowOf({ company: 'X', start: '2020-01', end: 'present' })).toBe('Experience · X · Jan 2020 – Present')
    const section = read(FILES.section)
    expect(section).toMatch(/getEntry\('jobs', 'hopper'\)/)
    expect(section).toMatch(/if \(!job\) throw new Error/)
    expect(section).toMatch(/if \(story\.role\.length === 0 \|\| story\.topics\.length === 0\) throw new Error/)
  })
})

describe('new content needs no layout work', () => {
  const plant = (claims: StoryClaim[]): StoryClaim[] => [...hopperClaims(), ...claims]

  // Amended by spec 038 (D229): the claims have no numbers, so the planted claim takes its place in reading order.
  test('S2.4 SC-005 FR-004 a new claim in a known topic joins its card in order, and the claims after it keep their order', () => {
    const story = storyOf(plant([{ id: 'planted', topic: 'Fintech AI', order: 10.5, text: 'A planted claim.', evidence: [] }]))
    const fintech = story.topics.find((topic) => topic.name === 'Fintech AI')
    expect(fintech?.items.map((item) => item.id)).toEqual(['hopper-fintech-ai-1', 'planted'])
    expect(fintech?.items[1]?.title).toBe('Fintech AI')
    const before = readingOrder(storyOf(hopperClaims()))
    const at = before.indexOf('hopper-fintech-ai-1') + 1
    expect(readingOrder(story)).toEqual([...before.slice(0, at), 'planted', ...before.slice(at)])
    expect(readingOrder(story)).toHaveLength(16)
  })

  test('S2.4 SC-005 FR-004 a new topic gets its own card, headed by its name, with no kicker or tags', () => {
    const story = storyOf(plant([{ id: 'planted', topic: 'The team', order: 20, text: 'A planted claim.', evidence: [] }]))
    expect(story.topics.at(-1)).toMatchObject({ name: 'The team', slug: 'the-team', title: 'The team', kicker: undefined, tags: [] })
    // Amended by spec 038 (D230): its claim takes the topic's title for its sparkle, with no number or kind.
    expect(story.topics.at(-1)?.items[0]).toStrictEqual({ id: 'planted', text: 'A planted claim.', evidence: [], title: 'The team' })
    expect(readingOrder(story).at(-1)).toBe('planted')
  })

  // Amended by spec 038 (D229): with no numbers, the quote comes last in reading order, after the topics' list.
  test('S2.4 SC-005 FR-004 a claim with the topic "Quote" shows as a quote after the topics, last in reading order', () => {
    const story = storyOf(plant([{ id: 'planted', topic: 'Quote', order: 1.5, text: '"A planted quote." A colleague.', evidence: [] }]))
    expect(story.quotes).toHaveLength(1)
    expect(story.quotes[0]).toStrictEqual({ id: 'planted', text: '"A planted quote." A colleague.', evidence: [], title: 'A colleague' })
    expect(story.role.map((item) => item.id)).toEqual(['hopper-role-and-dates-1', 'hopper-role-and-dates-2'])
    expect(readingOrder(story).at(-1)).toBe('planted')
    expect(read(FILES.section)).toMatch(/<\/ol>[\s\S]*story\.quotes\.length > 0[\s\S]*<blockquote>[\s\S]*<HopperClaim item=\{item\}/)
  })

  // Amended by spec 038 (D229, D230): a claim's links show at rest, as its card's sources under its claims and before
  // its tags, each by its label and host, and a source with no label stops the build. The claim carries the anchor its
  // receipt had and ends with its sparkle.
  test('S3.3 FR-005 a claim with evidence links lists each source under its card, by its label and host, and the build stops on a source with no label', () => {
    const story = storyOf(
      plant([
        {
          id: 'planted',
          topic: 'Fintech AI',
          order: 10.5,
          text: 'A planted claim.',
          evidence: ['https://example.com/a', 'https://example.com/b'],
        },
      ]),
    )
    const fintech = story.topics.find((topic) => topic.name === 'Fintech AI')
    const items = fintech?.items ?? []
    expect(items.find((entry) => entry.id === 'planted')?.evidence).toEqual(['https://example.com/a', 'https://example.com/b'])
    // Labels go by claim and host, so two sources of one claim on one host can't be told apart, and fail the build.
    expect(() => sourcesOf(items, [], { planted: { 'example.com': 'Source A' } })).toThrow('two sources on example.com')
    const one = items.map((entry) => (entry.id === 'planted' ? { ...entry, evidence: ['https://example.com/a'] } : entry))
    expect(sourcesOf(one, [], { planted: { 'example.com': 'Source A' } })).toEqual([
      { href: 'https://example.com/a', label: 'Source A', host: 'example.com', outside: true, claim: 'planted' },
    ])
    expect(() => sourcesOf(items, [], SOURCE_LABELS)).toThrow('The source https://example.com/a on planted has no label.')
    expect(read(FILES.claim)).toMatch(
      /<p class:list=\{\['ds-body', 'ds-claim', className\]\} id=\{anchorOf\(item\.id\)\} data-claim=\{item\.id\}>\s*<ClaimText text=\{item\.text\} words=\{item\.text\} title=\{item\.title\} \/>\s*<\/p>/,
    )
    expect(read(FILES.section)).toMatch(
      /<HopperClaim item=\{item\} \/>\s*\)\)\}\s*<\/div>\s*<Sources sources=\{sourcesOf\(topic\.items, \[\], SOURCE_LABELS\)\} id=\{`sources-hopper-\$\{topic\.slug\}`\} \/>\s*\{topic\.tags\.length > 0 && <Chips /,
    )
  })
})

describe('the files', () => {
  test('S1.4 FR-006 the section adds no motion, script, inline style or other host', () => {
    for (const file of [FILES.section, FILES.claim, FILES.data, FILES.css]) {
      const text = read(file).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
      expect(text, file).not.toMatch(/@keyframes|animation|transition/)
      expect(text, file).not.toMatch(/<script|style=/)
      expect(text, file).not.toMatch(/https?:\/\//)
    }
  })

  test('FR-001 the home shows the Hopper story under the hero, in place of the stub', () => {
    const page = read(FILES.page)
    expect(page).toMatch(/import Hopper from '\.\/Hopper\.astro'/)
    expect(page).toMatch(/<Hero role=\{role\} \/>\s*<Hopper role=\{role\} \/>/)
    expect(page).not.toMatch(/The work at Hopper|home-stub/)
    expect(read(FILES.section)).toMatch(/<section id="hopper" class="ds-band hopper" aria-labelledby="hopper-heading">/)
  })

  test('S5.1 only the home and the role pages show the Hopper story, and the essay and the 404 page are untouched (spec 019)', async () => {
    const { readdirSync } = await import('node:fs')
    const pages = site('src', 'pages')
    // Spec 014: the sections sit on the shared HomePage.astro, which the home and the role pages render.
    const home = site('src', 'components', 'home')
    expect(readdirSync(home).filter((name) => read(path.join(home, name)).includes('Hopper.astro'))).toEqual(['HomePage.astro'])
    expect(readdirSync(pages, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => read(path.join(pages, name)).includes('Hopper.astro'))).toEqual([])
    expect(readdirSync(pages, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => read(path.join(pages, name)).includes('HomePage.astro')).sort()).toEqual(['[role].astro', 'index.astro'])
    for (const v1 of ['vindecoded-agents.mdx', '404.astro'])
      expect(read(path.join(pages, v1)), v1).not.toMatch(/components\/home\//)
  })

  test("FR-009 the plan shows slice 3.3's state and the decision log holds D129", () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.3 Hopper \|[^\n]*spec 011[^\n]*D129/)
    expect(read(FILES.log)).toContain('[0129](0129-the-hopper-story-ships-from-the-public-resume-claims.md)')
  })
})
