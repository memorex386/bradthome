import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import {
  eyebrowOf,
  HEADING,
  NOTE_TOPICS,
  QUOTE_TOPIC,
  RECEIPT,
  RECEIPT_TITLES,
  ROLE_TOPIC,
  type StoryClaim,
  storyOf,
  TOPICS,
} from '../../../apps/site/src/components/home/hopper.ts'

// Spec 011's static checks: the Hopper story's layout rules on the real
// claims and on planted ones, its labels against the claims' words, and its
// files' rules (D129).

const ROOT = path.resolve(import.meta.dirname, '../../..')
const site = (...parts: string[]): string => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string): string => readFileSync(file, 'utf8')

const FILES = {
  section: site('src', 'components', 'home', 'Hopper.astro'),
  claim: site('src', 'components', 'home', 'HopperClaim.astro'),
  data: site('src', 'components', 'home', 'hopper.ts'),
  css: site('src', 'styles', 'home', 'hopper.css'),
  // Spec 014: /v2's page is the shared HomePage.astro.
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

const TOPIC_TITLES = [
  'Capital One Travel: Disruption Assistance',
  'The partner platform',
  'Fintech AI',
  'Human-approved agent workflow',
  'RemoteUI and WebViews',
]

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
    expect(shown).toHaveLength(12)
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
    expect(story.topics.map((topic) => topic.items.length)).toEqual([3, 3, 1, 1, 2])
  })

  test('S3.1 S3.2 FR-005 receipts are numbered 1 to 12 in reading order, and every one asks, since no Hopper claim has a link yet', () => {
    const story = storyOf(hopperClaims())
    const shown = [...story.role, ...story.topics.flatMap((topic) => topic.items)]
    expect(shown.map((item) => item.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    for (const item of shown) {
      expect(item.kind).toBe('ask')
      expect(item.title).toBe(RECEIPT_TITLES[item.id])
    }
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

  test('S2.3 FR-003 every receipt title uses only words from its own claim', () => {
    const claims = new Map(hopperClaims().map((claim) => [claim.id, claim.text.toLowerCase()]))
    for (const [id, title] of Object.entries(RECEIPT_TITLES)) {
      const text = claims.get(id)
      expect(text, id).toBeDefined()
      expect(holds(text ?? '', title), `${id}: ${title}`).toEqual([])
    }
  })

  test("S3.2 S3.3 FR-005 the receipt's fixed labels, and the ask-me link goes to brad@bradthome.com", () => {
    expect(RECEIPT).toEqual({
      proofLink: 'See the source',
      ask: 'No public link yet.',
      askLink: 'Ask Brad about it',
      askHref: 'mailto:brad@bradthome.com',
    })
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

  test('S2.4 SC-005 FR-004 a new claim in a known topic joins its card in order, and the numbers after it move up', () => {
    const story = storyOf(plant([{ id: 'planted', topic: 'Fintech AI', order: 9.5, text: 'A planted claim.', evidence: [] }]))
    const fintech = story.topics.find((topic) => topic.name === 'Fintech AI')
    expect(fintech?.items.map((item) => [item.id, item.n])).toEqual([
      ['hopper-fintech-ai-1', 9],
      ['planted', 10],
    ])
    expect(fintech?.items[1]?.title).toBe('Fintech AI')
    expect(story.topics.at(-1)?.items.at(-1)?.n).toBe(13)
  })

  test('S2.4 SC-005 FR-004 a new topic gets its own card, headed by its name, with no kicker or tags', () => {
    const story = storyOf(plant([{ id: 'planted', topic: 'The team', order: 20, text: 'A planted claim.', evidence: [] }]))
    expect(story.topics.at(-1)).toMatchObject({ name: 'The team', slug: 'the-team', title: 'The team', kicker: undefined, tags: [] })
    expect(story.topics.at(-1)?.items[0]).toMatchObject({ n: 13, kind: 'ask', title: 'The team' })
  })

  test('S2.4 SC-005 FR-004 a claim with the topic "Quote" shows as a quote after the topics, numbered last', () => {
    const story = storyOf(plant([{ id: 'planted', topic: 'Quote', order: 1.5, text: '"A planted quote." A colleague.', evidence: [] }]))
    expect(story.quotes).toHaveLength(1)
    expect(story.quotes[0]).toMatchObject({ id: 'planted', n: 13, kind: 'ask' })
    expect(story.role.map((item) => item.n)).toEqual([1, 2])
    expect(read(FILES.section)).toMatch(/story\.quotes\.length > 0[\s\S]*<blockquote>[\s\S]*<HopperClaim item=\{item\}/)
  })

  test('S3.3 FR-005 a claim with evidence links is proof, and its note links each source', () => {
    const story = storyOf(
      plant([
        {
          id: 'planted',
          topic: 'Fintech AI',
          order: 9.5,
          text: 'A planted claim.',
          evidence: ['https://example.com/a', 'https://example.com/b'],
        },
      ]),
    )
    const item = story.topics.flatMap((topic) => topic.items).find((entry) => entry.id === 'planted')
    expect(item).toMatchObject({ kind: 'proof', evidence: ['https://example.com/a', 'https://example.com/b'] })
    const claim = read(FILES.claim)
    expect(claim).toMatch(
      /item\.kind === 'proof' \?[\s\S]*item\.evidence\.map\(\(href, index\) =>[\s\S]*<a class="ds-link" href=\{href\}>[\s\S]*RECEIPT\.proofLink/,
    )
    expect(claim).toMatch(/<ReceiptMarker n=\{item\.n\} kind=\{item\.kind\} for=\{id\} \/>/)
    expect(claim).toMatch(/<Receipt slot="notes" id=\{id\} n=\{item\.n\} kind=\{item\.kind\} title=\{item\.title\}>/)
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

  test('FR-001 /v2 shows the Hopper story under the hero, in place of the stub', () => {
    const page = read(FILES.page)
    expect(page).toMatch(/import Hopper from '\.\/Hopper\.astro'/)
    expect(page).toMatch(/<Hero role=\{role\} \/>\s*<Hopper role=\{role\} \/>/)
    expect(page).not.toMatch(/The work at Hopper|home-stub/)
    expect(read(FILES.section)).toMatch(/<section id="hopper" class="ds-band hopper" aria-labelledby="hopper-heading">/)
  })

  test('S5.1 a release build leaves out /v2, and only /v2 shows the Hopper story, so it never reaches live and v1 is untouched', async () => {
    const { PHASE_3_PAGES } = await import('../../../scripts/site/release-pages.ts')
    expect(PHASE_3_PAGES).toContain('v2.html')
    const { readdirSync } = await import('node:fs')
    const pages = site('src', 'pages')
    // Spec 014: the sections sit on the shared HomePage.astro, which /v2 and the role pages render, all phase 3 pages.
    const home = site('src', 'components', 'home')
    expect(readdirSync(home).filter((name) => read(path.join(home, name)).includes('Hopper.astro'))).toEqual(['HomePage.astro'])
    expect(readdirSync(pages).filter((name) => read(path.join(pages, name)).includes('Hopper.astro'))).toEqual([])
    expect(readdirSync(pages).filter((name) => read(path.join(pages, name)).includes('HomePage.astro')).sort()).toEqual(['[role].astro', 'v2.astro'])
    expect(PHASE_3_PAGES).toEqual(expect.arrayContaining(['v2.html', 'mobile.html', 'fullstack.html', 'ai.html']))
    for (const v1 of ['index.astro', 'vindecoded-agents.mdx', '404.astro'])
      expect(read(path.join(pages, v1)), v1).not.toMatch(/components\/home\//)
  })

  test("FR-009 the plan shows slice 3.3's state and the decision log holds D129", () => {
    expect(read(FILES.plan)).toMatch(/\| 3\.3 Hopper \|[^\n]*spec 011[^\n]*D129/)
    expect(read(FILES.log)).toContain('[0129](0129-the-hopper-story-ships-from-the-public-resume-claims.md)')
  })
})
