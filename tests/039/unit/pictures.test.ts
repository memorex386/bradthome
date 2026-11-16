import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { parseResults } from '../../../apps/evals/src/results.ts'
import { checkFigure, FIGURES, figureOf, labelsOf, type LoopFigure, wordsOf } from '../../../apps/site/src/components/home/figures.ts'
import { iconOf, SITE_MARK } from '../../../apps/site/src/components/home/side.ts'
import {
  altOf,
  CARD_IDS,
  cardFor,
  essayCardOf,
  essayStatOf,
  evalsCardOf,
  heroCardOf,
  HEIGHT,
  pathOf,
  phasesOf,
  urlOf,
  WIDTH,
} from '../../../apps/site/src/components/share/share.ts'
import type { Route } from '@playwright/test'
import { assetsOf, clean, JOBS, MAX_BYTES, ORIGIN, serve } from '../../../scripts/site/share-cards.ts'
import { centered, fileOf, MIN_SIDE, parseCrop, SIZES } from '../../../scripts/site/photo.ts'
import { FAVICON, SIZE, squareOf, TOUCH_ICON, touchIconOf } from '../../../scripts/site/touch-icon.ts'

// Spec 039's unit checks: each share card's words from its page's own files,
// each Hopper diagram's labels against its claim, the side cards' pictures,
// the touch icon against the favicon, the photo's files, and the build step
// that draws the cards. The browser's checks are in tests/039/e2e.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const SITE = path.join(ROOT, 'apps', 'site')
const read = (...parts: string[]): string => readFileSync(path.join(SITE, ...parts), 'utf8')

interface Claim {
  id: string
  topic?: string
  text: string
  subject: string
}
const claims = (): Claim[] =>
  Object.entries(parse(read('content', 'claims.yaml')) as Record<string, Omit<Claim, 'id'>>).map(([id, claim]) => ({ id, ...claim }))

const essay = read('src', 'pages', 'vindecoded-agents.mdx')
const diagram = read('src', 'components', 'SystemDiagram.astro')
const results = parseResults(JSON.parse(readFileSync(path.join(ROOT, 'apps', 'evals', 'results.json'), 'utf8')))

/** A day in mid-November 2026, as the build's clock reads it. */
const NOV_2026 = new Date('2026-11-16T18:00:00Z')

describe('the share cards’ words (story 1)', () => {
  test("S1.1 FR-001 the home's card holds the eyebrow, the three words, the tiles with their years for the build's day, and the first line", () => {
    const card = heroCardOf('all', NOV_2026)
    expect(card.top).toEqual({ label: 'Brad Thome · Senior mobile & full-stack engineer', address: 'bradthome.com' })
    expect(card.words).toEqual([
      { text: 'Mobile', lit: false },
      { text: 'Full-stack', lit: false },
      { text: 'Applied AI', lit: false },
    ])
    expect(card.role).toBe(false)
    expect(card.tiles.map((tile) => [tile.name, tile.figure, tile.unit, tile.label, tile.lit])).toEqual([
      ['Mobile', '11+', 'yrs', 'Android and iOS apps, since May 2015', false],
      ['Full-stack', '10+', 'yrs', 'web front ends and backend services, since Sep 2016', false],
      ['Applied AI', 'Founding', undefined, "engineer on Hopper's Fintech AI team", false],
    ])
    expect(card.line).toBe('I build Android, iOS and web products end to end.')
    // The years count themselves (D224): May 2027 makes the mobile tile 12+, and Sep 2027 the full-stack one 11+.
    expect(heroCardOf('all', new Date('2027-05-15T18:00:00Z')).tiles.map((tile) => tile.figure)).toEqual(['12+', '10+', 'Founding'])
    expect(heroCardOf('all', new Date('2027-09-15T18:00:00Z')).tiles.map((tile) => tile.figure)).toEqual(['12+', '11+', 'Founding'])
  })

  test("S1.2 each role page's card shows its og:title, with its word and tile lit and the others quiet", () => {
    const titles = { mobile: 'Brad Thome · Mobile engineer', fullstack: 'Brad Thome · Full-stack engineer', ai: 'Brad Thome · Applied AI' }
    const words = { mobile: 'Mobile', fullstack: 'Full-stack', ai: 'Applied AI' }
    for (const role of ['mobile', 'fullstack', 'ai'] as const) {
      const card = heroCardOf(role, NOV_2026)
      expect(card.id).toBe(role)
      expect(card.top).toEqual({ label: titles[role], address: `bradthome.com/${role}` })
      expect(card.role).toBe(true)
      expect(card.words.filter((word) => word.lit).map((word) => word.text)).toEqual([words[role]])
      expect(card.tiles.filter((tile) => tile.lit).map((tile) => tile.name)).toEqual([words[role]])
    }
  })

  test("S1.3 FR-001 the essay's card reads its title, date, six phases and counts from the essay's own files", () => {
    const card = essayCardOf(essay, diagram)
    expect(card.top).toEqual({ label: 'Brad Thome · October 28, 2026', address: 'bradthome.com/vindecoded-agents' })
    expect(card.title).toBe('Running a 1.4M‑download product with AI agents')
    expect(card.phases.map((phase) => `${phase.number} ${phase.name}`)).toEqual([
      '1 Plan',
      '2 Build, one slice at a time',
      '3 Prove it',
      '4 Show me, then merge',
      '5 Release and turn on',
      '6 Watch and learn',
    ])
    expect(card.stat).toEqual({ lead: '1,235 pull requests merged, 83% from agent branches,', dates: 'June 13 to October 28, 2026' })
  })

  test("S1.3 FR-001 FR-002 the build fails when the essay's summary or diagram stops saying what its card reads", () => {
    expect(() => essayStatOf(essay.replace('came from agent branches', 'came from branches'))).toThrow(/summary/)
    expect(() => phasesOf(diagram.replace("phase(r6, '6 · Watch and learn')", "phase(r6, 'Watch and learn')"))).toThrow(
      /six numbered phases/,
    )
  })

  test("S1.4 FR-001 /evals' card reads the latest full run's safe and accurate counts, model and date", () => {
    const card = evalsCardOf(results)
    const accuracy = results.totals.judged ?? results.totals.accuracy
    expect(card.top).toEqual({ label: 'Brad Thome · Ask about Brad', address: 'bradthome.com/evals' })
    expect(card.title).toBe('How the chat is tested')
    expect(card.numbers).toEqual([
      { label: 'Safe answers', value: `${results.totals.safe} of ${results.totals.cases}` },
      { label: 'Accurate answers', value: `${accuracy.passed} of ${accuracy.cases}` },
      { label: 'Model that answers', value: 'Claude Haiku 5.5' },
    ])
    expect(card.line).toMatch(/^Run on [A-Z][a-z]+ \d{1,2}, \d{4}, on the real model, every answer checked\.$/)
  })

  test('S1.5 FR-003 FR-004 every card is a 1200 × 630 PNG at bradthome.com, and its alt text holds its words, with no avatar or photo', () => {
    expect([WIDTH, HEIGHT]).toEqual([1200, 630])
    expect(CARD_IDS).toEqual(['home', 'mobile', 'fullstack', 'ai', 'vindecoded-agents', 'evals'])
    for (const id of CARD_IDS) {
      expect(pathOf(id)).toBe(`/share/${id}.png`)
      expect(urlOf(id)).toBe(`https://bradthome.com/share/${id}.png`)
    }
    const home = altOf(heroCardOf('all', NOV_2026))
    for (const words of [
      'Brad Thome · Senior mobile & full-stack engineer',
      'Mobile: 11+ years',
      "Applied AI: Founding engineer on Hopper's Fintech AI team",
      'I build Android',
    ])
      expect(home).toContain(words)
    const article = altOf(essayCardOf(essay, diagram))
    expect(article).toContain('Running a 1.4M-download product with AI agents, by Brad Thome, October 28, 2026')
    expect(article).toContain('Plan; Build, one slice at a time; Prove it;')
    expect(altOf(evalsCardOf(results))).toMatch(
      /^How the chat is tested: safe answers, \d+ of \d+; accurate answers, \d+ of \d+; model that answers, Claude Haiku 5\.5\. Run on/,
    )
    // No card holds a picture of Brad (D226): the card component draws no image at all.
    expect(read('src', 'components', 'share', 'ShareCard.astro')).not.toMatch(/<img|<picture|avatar|photo/i)
  })

  test("S1.6 FR-003 a page with no card of its own names the home's", () => {
    expect(cardFor('/')).toBe('home')
    expect(cardFor('/mobile')).toBe('mobile')
    expect(cardFor('/fullstack/')).toBe('fullstack')
    expect(cardFor('/ai')).toBe('ai')
    expect(cardFor('/vindecoded-agents')).toBe('vindecoded-agents')
    expect(cardFor('/evals')).toBe('evals')
    for (const other of ['/privacy', '/design-system', '/404', '/v2', '/resume/mobile']) expect(cardFor(other), other).toBe('home')
  })
})

describe('the build step that draws the cards (FR-001, FR-002)', () => {
  test('FR-001 FR-012 the cards draw in the design system’s colors, and their page imports no stylesheet the site’s pages share', () => {
    // A shared import would split the site's CSS into new chunks and reorder each page's own styles.
    const tokens = read('src', 'styles', 'ds', 'tokens.css')
    const css = read('src', 'styles', 'share.css')
    const light = (name: string): string | undefined => new RegExp(`--color-${name}: light-dark\\((#[0-9a-f]{6}),`).exec(tokens)?.[1]
    for (const name of [
      'bg',
      'ink',
      'ink-2',
      'muted',
      'rule',
      'surface',
      'accent',
      'accent-soft',
      'band',
      'band-ink',
      'band-muted',
      'band-accent',
      'band-rule',
    ]) {
      expect(light(name), name).toMatch(/^#[0-9a-f]{6}$/)
      expect(new RegExp(`\\s--${name}: (#[0-9a-f]{6});`).exec(css)?.[1], name).toBe(light(name))
    }
    const page = read('src', 'pages', 'share', '[card].astro')
    expect(page).not.toMatch(/import '\.\.\/\.\.\/styles\//)
    expect(page).toMatch(/import shareStyles from '\.\.\/\.\.\/styles\/share\.css\?url'/)
  })

  test('FR-001 FR-002 SC-001 it draws six cards from their print pages, each under 300 KB', () => {
    expect(JOBS.map((job) => [job.source, job.output])).toEqual(CARD_IDS.map((id) => [`share/${id}.html`, `share/${id}.png`]))
    expect(MAX_BYTES).toBe(300 * 1024)
  })

  test('FR-001 it removes the print pages and any asset only they named, and keeps what other pages use', () => {
    const dist = mkdtempSync(path.join(tmpdir(), 'bradthome-039-'))
    try {
      mkdirSync(path.join(dist, 'share'))
      mkdirSync(path.join(dist, '_astro'))
      writeFileSync(path.join(dist, '_astro', 'only-share.css'), '.share{}')
      writeFileSync(path.join(dist, '_astro', 'shared.css'), ':root{}')
      writeFileSync(path.join(dist, 'index.html'), '<link rel="stylesheet" href="/_astro/shared.css">')
      for (const job of JOBS)
        writeFileSync(
          path.join(dist, job.source),
          '<link rel="stylesheet" href="/_astro/only-share.css"><link rel="stylesheet" href="/_astro/shared.css">',
        )
      writeFileSync(path.join(dist, 'share', 'home.png'), 'png')
      expect(assetsOf(readFileSync(path.join(dist, JOBS[0]?.source ?? ''), 'utf8'))).toEqual(['_astro/only-share.css', '_astro/shared.css'])
      clean(dist)
      for (const job of JOBS) expect(existsSync(path.join(dist, job.source)), job.source).toBe(false)
      expect(existsSync(path.join(dist, '_astro', 'only-share.css'))).toBe(false)
      expect(existsSync(path.join(dist, '_astro', 'shared.css'))).toBe(true)
      expect(existsSync(path.join(dist, 'share', 'home.png'))).toBe(true)
    } finally {
      rmSync(dist, { recursive: true, force: true })
    }
  })

  test('S1.7 FR-002 drawing serves only the build’s own files, and refuses and records any other ask, which fails the card', async () => {
    // A folder holding dist and a file beside it, which a request must not reach.
    const root = mkdtempSync(path.join(tmpdir(), 'bradthome-039-'))
    const dist = path.join(root, 'dist')
    try {
      mkdirSync(path.join(dist, '_astro'), { recursive: true })
      writeFileSync(path.join(dist, '_astro', 'card.css'), '.share{}')
      writeFileSync(path.join(root, 'beside.txt'), 'not the build’s')
      const refused: string[] = []
      // A stand-in for Playwright's route: it reports how serve() answered.
      const answer = async (url: string): Promise<string> => {
        let reply = ''
        const route = {
          request: () => ({ url: () => url }),
          abort: async (code: string) => {
            reply = `abort ${code}`
          },
          fulfill: async (response: { status: number; contentType?: string }) => {
            reply = `${response.status}${response.contentType === undefined ? '' : ` ${response.contentType}`}`
          },
        }
        await serve(route as unknown as Route, dist, refused)
        return reply
      }
      expect(await answer(`${ORIGIN}/_astro/card.css`)).toBe('200 text/css; charset=utf-8')
      expect(await answer('https://fonts.example/inter.woff2')).toBe('abort blockedbyclient')
      expect(await answer(`${ORIGIN}/_astro/missing.css`)).toBe('404')
      expect(await answer(`${ORIGIN}/..%2Fbeside.txt`)).toBe('404')
      expect(await answer(`${ORIGIN}/_astro`)).toBe('404')
      // A tab icon a browser asks for on its own isn't the card's ask.
      expect(await answer(`${ORIGIN}/favicon.ico`)).toBe('404')
      // draw() throws on any of these, so the build fails.
      expect(refused).toEqual([
        'https://fonts.example/inter.woff2',
        `${ORIGIN}/_astro/missing.css`,
        `${ORIGIN}/..%2Fbeside.txt`,
        `${ORIGIN}/_astro`,
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('the Hopper diagrams (story 3)', () => {
  test('S3.1 S3.2 S3.3 S3.4 FR-007 every label of the three diagrams is made of its claim’s words, from a claim on its card', () => {
    const all = claims().filter((claim) => claim.subject === 'hopper')
    expect(Object.keys(FIGURES)).toEqual(['Disruption Assistance', 'Mobile: RemoteUI and WebViews', 'Agent and experimentation workflow'])
    for (const [topic, figure] of Object.entries(FIGURES)) {
      expect(() => checkFigure(topic, figure, all), topic).not.toThrow()
      expect(figureOf(topic, all), topic).toBe(figure)
      for (const label of labelsOf(figure)) {
        const words = new Set(wordsOf(all.find((claim) => claim.id === label.claim)?.text ?? ''))
        for (const word of wordsOf(label.text)) expect(words.has(word), `${topic}: "${label.text}" has "${word}"`).toBe(true)
      }
    }
    expect(figureOf('Partner platform', all)).toBeUndefined()
    expect(figureOf('Fintech AI', all)).toBeUndefined()
  })

  test('S3.1 the Capital One diagram shows every layer of its end-to-end claim under its owner, then the partners and products', () => {
    const figure = FIGURES['Disruption Assistance']
    if (figure?.kind !== 'capital-one') throw new Error('no Capital One diagram')
    expect(figure.owner.text).toBe('Sole engineering owner')
    expect(figure.layers.map((layer) => layer.text)).toEqual([
      'RFC and ADR, stakeholder alignment',
      'New services on Terraform-provisioned GCP',
      'Backend APIs',
      'Payment flow with rewards points',
      'Offer generation and Redis caching',
      'React: bottom sheet, offer and purchase',
      'Feature flags and a phased rollout',
      'Analytics, monitoring and alerting',
    ])
    expect(figure.layers.every((layer) => layer.claim === 'hopper-disruption-assistance-2')).toBe(true)
    expect([figure.reuse.text, figure.partners.text, figure.products.text]).toEqual([
      'reusable capability',
      'Capital One → 5 more partners',
      '10+ partner products, including Frontier and Spirit',
    ])
  })

  test('S3.2 the RemoteUI diagram shows one server-driven UI reaching both apps by server deploys, with app releases struck', () => {
    const figure = FIGURES['Mobile: RemoteUI and WebViews']
    if (figure?.kind !== 'remoteui') throw new Error('no RemoteUI diagram')
    expect(labelsOf(figure).map((label) => label.text)).toEqual([
      'Server-driven UI',
      'components, actions,',
      'state management, API mappings',
      'server deploys',
      'app releases',
      'Android',
      'Jetpack Compose and MVVM',
      'iOS',
      'SwiftUI',
    ])
    expect(read('src', 'components', 'home', 'HopperFigure.astro')).toMatch(/<line class="hfig__strike"/)
  })

  test('S3.3 the loop runs telemetry, generates, the human approval, the release behind flags, outcomes, then promotion or rollback (Brad’s Gate 1 card)', () => {
    const figure = FIGURES['Agent and experimentation workflow'] as LoopFigure
    expect(figure.kind).toBe('loop')
    const component = read('src', 'components', 'home', 'HopperFigure.astro')
    // The boxes go clockwise from telemetry, with the approval after what the loop generates and before the release.
    const order = [
      'figure.telemetry.text',
      'figure.generates.text',
      'figure.approved.text',
      'figure.releases.text',
      'figure.monitors.text',
      'figure.promotion.text',
    ]
    const places = order.map((name) => component.indexOf(name))
    expect(places.every((place) => place > 0)).toBe(true)
    expect([...places].sort((a, b) => a - b)).toEqual(places)
    expect([figure.telemetrySources.text, figure.approved.text, figure.flags.text, figure.name.text]).toEqual([
      'Amplitude, BigQuery',
      'Human-approved',
      'LaunchDarkly',
      'Experimentation loop',
    ])
  })

  test('S3.4 FR-007 a label with a word its claim lacks, a claim off its card, or a missing claim fails the build', () => {
    const all = claims().filter((claim) => claim.subject === 'hopper')
    const figure = FIGURES['Disruption Assistance']
    if (figure?.kind !== 'capital-one') throw new Error('no Capital One diagram')
    expect(() =>
      checkFigure('Disruption Assistance', { ...figure, partners: { ...figure.partners, text: 'Capital One, then 5 more partners' } }, all),
    ).toThrow(/holds words its claim hopper-disruption-assistance-1 doesn't: then/)
    expect(() =>
      checkFigure(
        'Disruption Assistance',
        { ...figure, owner: { text: 'Senior Software Engineer', claim: 'hopper-role-and-dates-1' } },
        all,
      ),
    ).toThrow(/isn't on its card/)
    expect(() =>
      checkFigure(
        'Disruption Assistance',
        figure,
        all.filter((claim) => claim.id !== 'hopper-disruption-assistance-3'),
      ),
    ).toThrow(/needs the public claim hopper-disruption-assistance-3/)
    // Hopper.astro fails the build on a diagram whose topic no public claim has.
    expect(read('src', 'components', 'home', 'Hopper.astro')).toMatch(
      /has a diagram for "\$\{topic\}", which no public claim has as its topic/,
    )
  })
})

describe('the side cards’ pictures (story 2)', () => {
  test("S2.1 S2.2 S2.3 FR-005 a card shows its App Store snapshot's image, the site icon on bradthome.com's, or its badge with no snapshot", () => {
    const images = { 'appstore-1191483515': 'appstore-1191483515-c9595f51d2ce.webp' }
    expect(iconOf({ icon: { snapshot: 'appstore-1191483515' } }, images)).toBe('/previews/appstore-1191483515-c9595f51d2ce.webp')
    expect(iconOf({ icon: { snapshot: 'appstore-1544613828' } }, images)).toBeUndefined()
    expect(iconOf({ icon: 'site' }, images)).toBe('/favicon.svg')
    expect(SITE_MARK).toBe('/favicon.svg')
    expect(iconOf({}, images)).toBeUndefined()
  })
})

describe('the site icon (story 5)', () => {
  test('S5.1 FR-009 the favicon is "bt_": its letters as paths on #0e1116, with a faint light edge and a #8ea8ff cursor bar', () => {
    const favicon = readFileSync(FAVICON, 'utf8')
    expect(favicon).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32">/)
    expect(favicon).toContain('<rect width="32" height="32" rx="7" fill="#0e1116"/>')
    expect(favicon).toContain('stroke="#fff" stroke-opacity=".16"')
    expect(favicon).toMatch(/<path fill="#e8eaed" d="M[\d. HLMQVZ]+Z"\/>/)
    expect(favicon).toContain('fill="#8ea8ff"/>')
    // A tab can't load the site's fonts, so no text, font or outside reference.
    expect(favicon).not.toMatch(/<text|font-family|href=|<image|<script/)
  })

  test('S5.2 FR-009 the touch icon is the favicon on a full 180 px square, as pnpm touch-icon draws it', async () => {
    const committed = sharp(readFileSync(TOUCH_ICON))
    const meta = await committed.metadata()
    expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(['png', SIZE, SIZE, false])
    const pixels = await committed.raw().toBuffer()
    // Square corners: the top-left pixel is the mark's ground, not a transparent or rounded corner.
    expect([...pixels.subarray(0, 3)]).toEqual([0x0e, 0x11, 0x16])
    const drawn = await sharp(await touchIconOf(readFileSync(FAVICON, 'utf8')))
      .raw()
      .toBuffer()
    // Drawn again from the favicon, it matches the committed icon. Another platform's rasterizer may shade an edge
    // pixel a step differently, so a channel may differ by 2 at most, on under 1% of the pixels; a changed favicon
    // moves far more.
    expect(drawn.length).toBe(pixels.length)
    let off = 0
    let worst = 0
    for (let index = 0; index < pixels.length; index += 3) {
      const most = Math.max(...[0, 1, 2].map((channel) => Math.abs((drawn[index + channel] ?? 0) - (pixels[index + channel] ?? 0))))
      worst = Math.max(worst, most)
      if (most > 0) off += 1
    }
    expect(worst).toBeLessThanOrEqual(2)
    expect(off).toBeLessThan((SIZE * SIZE) / 100)
    expect(squareOf(readFileSync(FAVICON, 'utf8'))).not.toMatch(/rx="7"|stroke-opacity/)
  })
})

describe('the photo (story 6)', () => {
  test('S6.2 FR-010 the photo is 64, 76, 128 and 152 px WebP, square, with no metadata', async () => {
    expect(SIZES).toEqual([64, 76, 128, 152])
    for (const size of SIZES) {
      const meta = await sharp(path.join(SITE, 'public', 'photo', fileOf(size))).metadata()
      expect([meta.format, meta.width, meta.height], fileOf(size)).toEqual(['webp', size, size])
      expect([meta.exif, meta.icc, meta.xmp, meta.iptc], fileOf(size)).toEqual([undefined, undefined, undefined, undefined])
    }
  })

  test('S6.1 FR-010 pnpm photo refuses a source under 400 px square, and crops the largest centered square by default', () => {
    expect(MIN_SIDE).toBe(400)
    expect(centered(800, 600)).toEqual({ left: 100, top: 0, size: 600 })
    expect(parseCrop('75,60,680', 800, 800)).toEqual({ left: 75, top: 60, size: 680 })
    expect(() => parseCrop('0,0,399', 800, 800)).toThrow(/at least 400 px/)
    expect(() => parseCrop('200,200,680', 800, 800)).toThrow(/runs past/)
    expect(() => parseCrop('a,b,c', 800, 800)).toThrow(/three whole numbers/)
  })
})
