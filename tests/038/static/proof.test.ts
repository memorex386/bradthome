import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { caseHash } from '../../../apps/evals/src/run.ts'
import { type CorpusInput, corpusOf, SITE } from '../../../apps/site/src/corpus/corpus.ts'
import { essayTitleOf } from '../../../apps/site/src/corpus/essay.ts'
import { anchorOf, askNameOf, keyOf, questionOf, sourcesOf, statLinksOf } from '../../../apps/site/src/components/ds/proof.ts'
import { DETAIL } from '../../../apps/site/src/components/home/hero.ts'
import {
  cardsOf as experienceCardsOf,
  type ExperienceJob,
  RECEIPT_TITLES as EXPERIENCE_TITLES,
  statsOf,
} from '../../../apps/site/src/components/home/experience.ts'
import { type Item, RECEIPT_TITLES as HOPPER_TITLES, storyOf, type StoryClaim } from '../../../apps/site/src/components/home/hopper.ts'
import { TOPIC_ORDER, topicOrderOf } from '../../../apps/site/src/components/home/roles.ts'
import {
  cardsOf as sideCardsOf,
  linksOf,
  LOOKS as SIDE_LOOKS,
  RECEIPT_TITLES as SIDE_TITLES,
  type SideProject,
} from '../../../apps/site/src/components/home/side.ts'
import { SOURCE_LABELS } from '../../../apps/site/src/components/home/sources.ts'
import { colorTokens, contrast, read, repoPath, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 038's static checks: the real cards' stats and sources, the sparkle's
// and the claim's markup and CSS, the eval cases, the charter, the records
// and the motion (D229–D231). The browser's checks are in tests/038/e2e.

type Claim = StoryClaim & { subject: string; visibility: string }

const CONTENT = sitePath('content')
const claims = (): Claim[] =>
  Object.entries(parse(read(path.join(CONTENT, 'claims.yaml'))) as Record<string, Omit<Claim, 'id'>>).map(([id, claim]) => ({
    id,
    ...claim,
  }))
const folder = <T>(name: string): (T & { id: string })[] =>
  readdirSync(path.join(CONTENT, name))
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => ({ id: file.slice(0, -'.yaml'.length), ...(parse(read(path.join(CONTENT, name, file))) as T) }))
const jobs = (): ExperienceJob[] => folder<Omit<ExperienceJob, 'id'>>('jobs')
const projects = (): SideProject[] => folder<Omit<SideProject, 'id'>>('projects')

const hopper = () => storyOf(claims().filter((claim) => claim.subject === 'hopper'))
const experience = () => experienceCardsOf(jobs(), claims())
const side = () => sideCardsOf(projects(), claims())

/** The 30 claims on the home's cards, in reading order. */
const items = (): Item[] => {
  const story = hopper()
  const work = experience()
  return [
    ...story.role,
    ...story.topics.flatMap((topic) => topic.items),
    ...story.quotes,
    ...[...work.featured, ...work.cards].flatMap((card) => card.items),
    ...side().flatMap((card) => card.items),
  ]
}

const PLAY_BR = 'https://play.google.com/store/apps/details?id=com.bleacherreport.android.teamstream'
const PLAY_VD = 'https://play.google.com/store/apps/details?id=com.mtsdealersolutions.vindecoded'
const STORE_VD = 'https://apps.apple.com/us/app/vindecoded/id1191483515'
const YMMV = 'https://yourmileagemayvary.com/2024/07/22/how-to-beat-deltas-meltdown-with-capital-ones-flight-disruption-assistance/'
const HTS = 'https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one'
const AGREEMENT = 'https://github.com/memorex386/bradthome/blob/main/docs/working-agreement.md'
const RELEASE = 'https://github.com/memorex386/bradthome/blob/main/docs/releases/v2.5.0.md'

/** A source file with its comments taken out, so only what it renders or runs is searched. */
const code = (file: string): string =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/ .*$/gm, '')

/** Every file under a folder with one of the extensions. */
const files = (dir: string, extensions: readonly string[]): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return files(full, extensions)
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [full] : []
  })

const CSS = read(sitePath('src', 'styles', 'ds', 'components.css')).replace(/\/\*[\s\S]*?\*\//g, '')

/** The declarations of the first rule whose selector list is exactly `selector`. */
const rule = (css: string, selector: string): string => {
  const at = css.indexOf(`${selector} {`)
  if (at < 0) throw new Error(`No rule for ${selector}`)
  return css.slice(at, css.indexOf('}', at))
}

describe('proof on the card (story 1)', () => {
  test('S1.1 FR-001 the markers, the drawers and their words are gone from the site', () => {
    for (const gone of ['Receipts.astro', 'ReceiptMarker.astro', 'receipts.ts'])
      expect(existsSync(sitePath('src', 'components', 'ds', gone)), gone).toBe(false)
    expect(CSS).not.toMatch(/\.ds-marker|\.ds-receipts|ds-rv-pop|ds-receipts-flash|details-content/)
    const sources = files(sitePath('src'), ['.astro', '.ts', '.tsx', '.mdx'])
    for (const file of sources) {
      const text = code(file)
      for (const words of ['Ask me', 'Ask Brad about it', 'Ask Brad about these', 'No public link', 'ReceiptMarker', '<Receipts'])
        expect(text.includes(words), `${path.relative(sitePath(), file)}: ${words}`).toBe(false)
    }
  })

  test('S1.2 FR-002 B/R’s 10M+ and VINDecoded’s 1M+ and 400K+ link their store listings', () => {
    const br = experience().featured.find((card) => card.job.id === 'bleacher-report')
    expect(br?.stats).toEqual([
      { value: '10M+', label: "B/R's app installs on Google Play", href: PLAY_BR },
      { value: 'Promoted', label: 'Senior Android Developer, Dec 2020' },
    ])
    const vd = side().find((card) => card.project.id === 'vindecoded')
    expect(vd?.stats).toEqual([
      { value: '1M+', label: 'Android downloads · 4.5 stars', href: PLAY_VD },
      { value: '400K+', label: 'iOS downloads · 4.7 stars', href: STORE_VD },
    ])
  })

  test('FR-002 a stat links only a URL in its own claim’s evidence', () => {
    const byId = new Map(claims().map((claim) => [claim.id, claim]))
    const looks = [
      ...[...experience().featured, ...experience().cards].map((card) => ({
        card: card.job.id,
        stats: card.stats,
        look: card.look.stats ?? [],
      })),
      ...side().map((card) => ({ card: card.project.id, stats: card.stats, look: SIDE_LOOKS[card.project.id]?.stats ?? [] })),
    ]
    let linked = 0
    for (const { card, stats, look } of looks) {
      stats.forEach((stat, index) => {
        if (stat.href === undefined) return
        linked += 1
        const claim = look[index]?.claim
        expect(claim, `${card} ${stat.value}`).toBeDefined()
        expect(byId.get(claim ?? '')?.evidence, `${card} ${stat.value}`).toContain(stat.href)
      })
    }
    expect(linked).toBe(3)
  })

  test('FR-002 a stat whose source isn’t its claim’s evidence, or whose claim isn’t on its card, fails the build', () => {
    const card: Item[] = [{ id: 'one', text: 'One.', evidence: ['https://play.google.com/x'], title: 'One' }]
    expect(statsOf('c', [{ value: '1', label: 'a', claim: 'one', source: 'play.google.com' }], card)).toEqual([
      { value: '1', label: 'a', href: 'https://play.google.com/x' },
    ])
    expect(() => statsOf('c', [{ value: '1', label: 'a', claim: 'one', source: 'apps.apple.com' }], card)).toThrow('holds 0 times')
    expect(() => statsOf('c', [{ value: '1', label: 'a', claim: 'two', source: 'play.google.com' }], card)).toThrow(
      "A stat on c names two, which its card doesn't show.",
    )
    expect(() => statsOf('c', [{ value: '1', label: 'a', source: 'play.google.com' }], card)).toThrow('without naming its claim')
  })

  test('S1.3 S1.4 S1.5 FR-003 FR-004 each card lists exactly the sources its stats and links don’t show', () => {
    const story = hopper()
    expect(sourcesOf(story.role, [], SOURCE_LABELS)).toEqual([])
    const listed = Object.fromEntries(story.topics.map((topic) => [topic.slug, sourcesOf(topic.items, [], SOURCE_LABELS)]))
    expect(listed).toEqual({
      'disruption-assistance': [
        {
          href: YMMV,
          label: 'The offer card, in a 2024 travel-blog post',
          host: 'yourmileagemayvary.com',
          outside: true,
          claim: 'hopper-disruption-assistance-4',
        },
        {
          href: HTS,
          label: 'Hopper Technology Solutions, March 2026',
          host: 'hts.hopper.com',
          outside: true,
          claim: 'hopper-disruption-assistance-4',
        },
      ],
      'partner-platform': [],
      'fintech-ai': [],
      'agent-and-experimentation-workflow': [],
      'mobile-remoteui-and-webviews': [],
    })
    for (const card of [...experience().featured, ...experience().cards])
      expect(sourcesOf(card.items, statLinksOf(card.stats), SOURCE_LABELS), card.job.id).toEqual([])
    const sides = Object.fromEntries(side().map((card) => [card.project.id, sourcesOf(card.items, linksOf(card), SOURCE_LABELS)]))
    expect(sides.vindecoded).toEqual([])
    expect(sides['sudoku-world']).toEqual([])
    expect(sides['bradthome-com']).toEqual([
      { href: '/design-system', label: 'The design system', host: 'bradthome.com', outside: false, claim: 'bradthome-com-1' },
      {
        href: AGREEMENT,
        label: 'Each feature starts as a spec Brad approves',
        host: 'github.com',
        outside: true,
        claim: 'bradthome-com-2',
      },
      { href: RELEASE, label: "A release's written record", host: 'github.com', outside: true, claim: 'bradthome-com-3' },
      { href: '/evals', label: 'The latest eval run, case by case', host: 'bradthome.com', outside: false, claim: 'bradthome-com-4' },
    ])
    // FR-004: the cards' own links stay.
    expect(Object.fromEntries(side().map((card) => [card.project.id, linksOf(card).slice(statLinksOf(card.stats).length)]))).toEqual({
      vindecoded: ['https://vindecoded.com', '/vindecoded-agents'],
      'sudoku-world': ['https://sudokuworld.app'],
      'bradthome-com': ['https://github.com/memorex386/bradthome'],
    })
  })

  test('S1.6 SC-002 the cards link all 13 distinct public sources of their claims at rest', () => {
    const evidence = new Set(items().flatMap((item) => item.evidence.map(keyOf)))
    const work = experience()
    const linked = new Set(
      [
        ...hopper().topics.flatMap((topic) => sourcesOf(topic.items, [], SOURCE_LABELS).map((source) => source.href)),
        ...[...work.featured, ...work.cards].flatMap((card) => [
          ...statLinksOf(card.stats),
          ...sourcesOf(card.items, statLinksOf(card.stats), SOURCE_LABELS).map((source) => source.href),
        ]),
        ...side().flatMap((card) => [
          ...linksOf(card),
          ...sourcesOf(card.items, linksOf(card), SOURCE_LABELS).map((source) => source.href),
        ]),
      ].map(keyOf),
    )
    expect(evidence.size).toBe(13)
    expect([...linked].sort()).toEqual([...evidence].sort())
  })

  test('FR-003 the six labels are Brad’s Gate 1 card’s, each for a source a card lists', () => {
    expect(SOURCE_LABELS).toEqual({
      [YMMV]: 'The offer card, in a 2024 travel-blog post',
      [HTS]: 'Hopper Technology Solutions, March 2026',
      'https://bradthome.com/design-system': 'The design system',
      [AGREEMENT]: 'Each feature starts as a spec Brad approves',
      [RELEASE]: "A release's written record",
      'https://bradthome.com/evals': 'The latest eval run, case by case',
    })
  })
})

describe('the sparkle (story 2)', () => {
  test('S2.1 FR-005 each claim carries its anchor and ends with the sparkle, kept to its last word', () => {
    const hopperClaim = read(sitePath('src', 'components', 'home', 'HopperClaim.astro'))
    expect(hopperClaim).toMatch(
      /<p class:list=\{\['ds-body', 'ds-claim', className\]\} id=\{anchorOf\(item\.id\)\} data-claim=\{item\.id\}>/,
    )
    expect(hopperClaim).toMatch(/<ClaimText text=\{item\.text\} words=\{item\.text\} title=\{item\.title\} \/>/)
    const sideClaim = read(sitePath('src', 'components', 'home', 'SideClaim.astro'))
    expect(sideClaim).toMatch(/<div class="side__claim ds-claim" id=\{anchorOf\(item\.id\)\} data-claim=\{item\.id\}>/)
    expect(sideClaim.match(/<ClaimText text=\{(block\.text|text)\} words=\{item\.text\} title=\{item\.title\} \/>/g)).toHaveLength(2)
    const text = read(sitePath('src', 'components', 'ds', 'ClaimText.astro'))
    // Astro drops the line breaks Prettier puts between them, so the word and its sparkle touch.
    expect(text).toMatch(
      /\{head\}\s*<span class="ds-claim__end">\s*\{last\}\s*<ClaimAsk text=\{words\} title=\{title\} demo=\{demo\} \/>\s*<\/span>/,
    )
    expect(rule(CSS, '.ds-claim__end')).toMatch(/white-space: nowrap;/)
    const ask = read(sitePath('src', 'components', 'ds', 'ClaimAsk.astro'))
    expect(ask).toMatch(
      /href=\{ASK\.href\}\s+data-chat-ask=\{questionOf\(text\)\}\s+data-tip=\{ASK\.tip\}\s+aria-label=\{askNameOf\(title\)\}/,
    )
    expect(ask).toMatch(/<Icon name="sparkle" \/>/)
  })

  test('S2.4 each of the 30 claims has a title of its own, so the sparkles’ names tell them apart', () => {
    const titles = { ...HOPPER_TITLES, ...EXPERIENCE_TITLES, ...SIDE_TITLES }
    const all = items()
    expect(all).toHaveLength(30)
    for (const item of all) expect(titles[item.id], item.id).toBe(item.title)
    expect(new Set(all.map((item) => askNameOf(item.title))).size).toBe(30)
  })

  test('S2.8 FR-006 the sparkle’s target is 44 px square, out of its line’s height', () => {
    const ask = rule(CSS, '.ds-claim-ask')
    expect(ask).toMatch(/--ask-target: 2\.75rem;/)
    expect(ask).toMatch(/width: var\(--ask-target\);\s*height: var\(--ask-target\);/)
    expect(ask).toMatch(/margin-block: calc\(var\(--ask-target\) \/ -2\);/)
    expect(ask).toMatch(/vertical-align: middle;/)
  })

  test('S2.9 FR-006 at rest the sparkle keeps 3:1 or more on every background it sits on, in both themes', () => {
    const tokens = colorTokens()
    const at = (name: string, theme: 'light' | 'dark'): string => tokens.get(name)?.[theme] ?? ''
    // The band's highlighted card is the band under rgb(142 168 255 / 0.08).
    const tint = (hex: string, alpha: number): string =>
      `#${[1, 3, 5]
        .map((i) =>
          Math.round(
            alpha * Number.parseInt(['8e', 'a8', 'ff'][(i - 1) / 2] ?? '0', 16) + (1 - alpha) * Number.parseInt(hex.slice(i, i + 2), 16),
          ),
        )
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')}`
    for (const theme of ['light', 'dark'] as const) {
      for (const on of ['bg', 'surface'])
        expect(contrast(at('dim', theme), at(on, theme)), `dim on ${on}, ${theme}`).toBeGreaterThanOrEqual(3)
      const band = at('band', theme)
      expect(contrast(at('band-dim', theme), band), `band-dim on band, ${theme}`).toBeGreaterThanOrEqual(3)
      expect(contrast(at('band-dim', theme), tint(band, 0.08)), `band-dim on the band's highlight, ${theme}`).toBeGreaterThanOrEqual(3)
      // Quieter than the band's text.
      expect(contrast(at('band-dim', theme), band)).toBeLessThan(contrast(at('band-muted', theme), band))
    }
    expect(rule(CSS, '.ds-claim-ask')).toMatch(/--ask-color: var\(--color-dim\);/)
    expect(rule(CSS, '.ds-band .ds-claim-ask')).toMatch(/--ask-color: var\(--color-band-dim\);/)
  })

  test('S2.5 FR-006 on hover and focus it takes the accent on a disc, with a ring and the tooltip from its data-tip', () => {
    expect(CSS).toMatch(
      /\.ds-claim-ask:hover,\s*\.ds-claim-ask\.is-hover,\s*\.ds-claim-ask:focus-visible,\s*\.ds-claim-ask\.is-focus \{\s*color: var\(--ask-on\);/,
    )
    expect(CSS).toMatch(/\.ds-claim-ask:focus-visible::before,\s*\.ds-claim-ask\.is-focus::before \{\s*outline: 2px solid var\(--ask-on\);/)
    expect(rule(CSS, '.ds-claim-ask::after')).toMatch(/content: attr\(data-tip\);[\s\S]*opacity: 0;[\s\S]*pointer-events: none;/)
    expect(CSS).toMatch(/@media \(hover: hover\) \{\s*\.ds-claim-ask:hover::after \{\s*opacity: 1;/)
  })
})

describe('the anchor (story 3)', () => {
  test('S3.1 S3.4 FR-007 the corpus sends each card claim to the anchor the claim now carries', () => {
    const essay = read(sitePath('src', 'pages', 'vindecoded-agents.mdx'))
    const input = {
      jobs: jobs(),
      projects: projects(),
      career: folder('career'),
      claims: claims(),
      essay: { title: essayTitleOf(essay), source: essay },
    } as unknown as CorpusInput
    const corpus = corpusOf(input)
    for (const item of items()) {
      const source = corpus.sources.find((entry) => entry.id === item.id)
      expect(source?.url, item.id).toBe(`${SITE}/#${anchorOf(item.id)}`)
    }
  })

  test('S3.2 S3.3 FR-007 a claim lands 40% down, tints while it’s the target, and fades only with motion allowed (MA-23)', () => {
    const { still, blocks } = withoutMotionBlocks(CSS)
    expect(rule(still, '.ds-claim')).toMatch(/scroll-margin-block: 40vh;/)
    expect(still).toMatch(/\.ds-claim:target,\s*\.ds-claim\.is-target \{\s*background: var\(--claim-flash\);/)
    expect(still).not.toMatch(/ds-claim-flash/)
    expect(blocks.join('\n')).toMatch(/\.ds-claim:target \{[^}]*animation: ds-claim-flash 1600ms var\(--ease-out-soft\) 1;/)
  })
})

describe('asking stays checked (story 4)', () => {
  const results = JSON.parse(read(repoPath('apps', 'evals', 'results.json'))) as { cases: { id: string; hash?: string }[] }
  const recorded = new Map(results.cases.map((c) => [c.id, c.hash]))

  test('S4.1 FR-009 one facts case per claim, asking its sparkle’s question and citing it', () => {
    const cases = CASES.filter((c) => c.id.startsWith('facts-receipt'))
    expect(cases).toHaveLength(30)
    for (const item of items()) {
      const found = CASES.find((c) => c.id === `facts-receipt-${item.id}`)
      expect(found?.question, item.id).toBe(questionOf(item.text))
      expect(found?.suite, item.id).toBe('facts')
      expect(found?.expect.states, item.id).toEqual(['answered'])
      // FR-009, on Brad's card: the platform's case may also cite the VINDecoded project or the essay's product section.
      expect(found?.expect.cites, item.id).toEqual(
        item.id === 'vindecoded-2' ? ['vindecoded-2', 'project-vindecoded', 'essay-product'] : [item.id],
      )
    }
  })

  test('S4.2 FR-009 the 20 “Ask me” cases keep their hashes, the drawers’ six are gone, and the ten with links are new', () => {
    expect(CASES.filter((c) => c.id.startsWith('facts-receipts-'))).toEqual([])
    const all = items()
    const kept = all.filter((item) => item.evidence.length === 0)
    const added = all.filter((item) => item.evidence.length > 0)
    expect(kept).toHaveLength(20)
    expect(added).toHaveLength(10)
    for (const item of kept) {
      const found = CASES.find((c) => c.id === `facts-receipt-${item.id}`)
      expect(found && caseHash(found), item.id).toBe(recorded.get(`facts-receipt-${item.id}`))
    }
    for (const item of added) {
      const found = CASES.find((c) => c.id === `facts-receipt-${item.id}`)
      expect(recorded.has(`facts-receipt-${item.id}`), item.id).toBe(false)
      expect(found?.title, item.id).toBe(`“Ask about this” on “${item.title}”`)
    }
  })

  test('S4.3 SC-005 FR-009 the changed run asked every new case and each passed', () => {
    const changed = JSON.parse(read(repoPath('apps', 'evals', 'changed.json'))) as {
      mode: string
      passed: boolean
      cases: { id: string; pass: boolean }[]
    }
    expect(changed.mode).toBe('changed')
    expect(changed.passed).toBe(true)
    for (const item of items().filter((entry) => entry.evidence.length > 0))
      expect(changed.cases.find((c) => c.id === `facts-receipt-${item.id}`)?.pass, item.id).toBe(true)
  })
})

describe('the record (story 5)', () => {
  test('S5.1 FR-010 the charter drops "Every claim links to its evidence" and numbers the other five', () => {
    const charter = read(repoPath('docs', 'charter.md'))
    const section = charter.slice(charter.indexOf('## Product principles'), charter.indexOf('## Risks'))
    expect(section).not.toContain('Every claim links to its evidence')
    const principles = [...section.matchAll(/^(\d)\. (.+)$/gm)].map((match) => [match[1], match[2]?.split('.')[0]])
    expect(principles).toEqual([
      ['1', 'Phone first'],
      ['2', 'Fast and accessible by default: good Core Web Vitals, and WCAG 2'],
      ['3', 'Purposeful motion'],
      ['4', 'Public facts only'],
      ['5', 'The site is a work sample'],
    ])
    expect(charter.slice(charter.indexOf('## Changes since approval'))).toMatch(/\[D231\]\(decisions\/0231-[a-z0-9-]+\.md\)/)
  })

  test('FR-013 D229–D231 are recorded and indexed, slice 5.11 is in the plan, and specs 009, 026 and 030 point here', () => {
    const decisions = repoPath('docs', 'decisions')
    const index = read(path.join(decisions, 'README.md'))
    for (const id of ['0229', '0230', '0231']) {
      const file = readdirSync(decisions).find((name) => name.startsWith(`${id}-`))
      expect(file, id).toBeDefined()
      const record = read(path.join(decisions, file ?? ''))
      expect(record, id).toMatch(new RegExp(`^log-id: D${Number(id)}$`, 'm'))
      expect(record, id).toMatch(/^status: accepted$/m)
      expect(index, id).toContain(`[${id}](${file})`)
    }
    expect(read(repoPath('docs', 'plan.md'))).toMatch(/\| 5\.11 Proof on the card \|/)
    for (const spec of ['009-design-system', '026-landing-a2', '030-landing-a6'])
      expect(read(repoPath('specs', spec, 'spec.md')), spec).toMatch(/spec 038/)
  })

  test('S5.2 FR-011 the gallery shows proof on the card in place of the receipts', () => {
    const gallery = read(sitePath('src', 'pages', 'design-system.astro'))
    expect(gallery).toContain('id="proof"')
    expect(gallery).toContain('id="proof-band"')
    expect(gallery).not.toContain('id="receipts"')
    expect(gallery).toContain("{ label: 'Proof', href: '#proof' }")
    for (const part of ['<ClaimAsk', '<ClaimText', '<Sources', "href: 'https://github.com/memorex386/bradthome' }", 'ds-claim is-target'])
      expect(gallery, part).toContain(part)
  })

  test('S5.3 FR-011 nothing a visitor reads on the site promises numbered receipts or drawers', () => {
    for (const file of files(sitePath('src'), ['.astro', '.mdx', '.tsx'])) {
      const text = code(file)
      for (const words of [/numbered (receipt|marker|dot)/i, /\bdrawer\b/i])
        expect(words.test(text), `${path.relative(sitePath(), file)}: ${words}`).toBe(false)
    }
  })
})

describe('motion (story 6)', () => {
  test('S6.1 FR-008 the markers’ pop and the drawer’s motion are gone, and nothing animates the sparkles in', () => {
    expect(CSS).not.toMatch(/MA-11|MA-12|ds-rv-pop|\.ds-claims \.ds-marker/)
    expect(code(sitePath('src', 'components', 'home', 'reveal.client.ts'))).not.toContain('marker')
    expect(CSS).not.toMatch(/\.ds-claim-ask[^{]*\{[^}]*animation/)
  })

  test('S6.2 FR-008 MA-22 and MA-23 run only inside the no-preference query', () => {
    const { still, blocks } = withoutMotionBlocks(CSS)
    for (const selector of ['.ds-claim-ask', '.ds-claim-ask::before', '.ds-claim-ask::after', '.ds-source', '.ds-stat--link', '.ds-claim'])
      expect(rule(still, selector), selector).not.toMatch(/transition|animation/)
    const motion = blocks.join('\n')
    expect(motion).toMatch(/\.ds-claim-ask \{\s*transition: color var\(--duration-quick\) var\(--ease-out-soft\);/)
    expect(motion).toMatch(
      /\.ds-claim-ask::after \{\s*translate: 0 2px;\s*transition:\s*opacity 150ms var\(--ease-out-soft\),\s*translate 150ms var\(--ease-out-soft\);/,
    )
  })
})

describe('what stays (FR-012)', () => {
  test('FR-012 the hero’s detail keeps its label and question, and the role pages keep their topic order', () => {
    expect(DETAIL.receipts).toBe('Proof')
    expect(DETAIL.ask).toBe('Ask about this')
    // The orders as main had them before this slice (spec 014, D134).
    expect(TOPIC_ORDER).toEqual({
      mobile: [
        'Mobile: RemoteUI and WebViews',
        'Disruption Assistance',
        'Partner platform',
        'Fintech AI',
        'Agent and experimentation workflow',
      ],
      fullstack: [
        'Disruption Assistance',
        'Partner platform',
        'Mobile: RemoteUI and WebViews',
        'Agent and experimentation workflow',
        'Fintech AI',
      ],
      ai: [
        'Fintech AI',
        'Agent and experimentation workflow',
        'Partner platform',
        'Disruption Assistance',
        'Mobile: RemoteUI and WebViews',
      ],
    })
    for (const role of ['mobile', 'fullstack', 'ai'] as const)
      expect(
        storyOf(
          claims().filter((claim) => claim.subject === 'hopper'),
          topicOrderOf(role),
        ).topics.map((topic) => topic.name),
      ).toEqual(TOPIC_ORDER[role])
  })
})
