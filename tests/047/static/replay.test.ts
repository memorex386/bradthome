import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { RECEIPT_TITLES, REPLAY_TOPIC, TOPICS } from '../../../apps/site/src/components/home/hopper.ts'
import { CLAIMS } from '../helpers/claims.ts'

// Spec 047's source, read as text: where the replay sits and how its box is
// sized before any script (FR-001), how it loads (FR-003), its holds and loop
// (FR-004), its motion (FR-006, S2.6), what's hidden and what's linked
// (FR-007), the page (FR-008), the claims, their sparkles and eval cases
// (FR-009, S4.1–S4.5), the CSP (S5.5) and the records (FR-013).

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')
const src = (...parts: string[]) => read('apps', 'site', 'src', ...parts)
const replay = (file: string) => src('components', 'replay', file)
const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** The source with each no-preference block taken out, and the blocks, braces matched. */
function split(css: string): { still: string; blocks: string[] } {
  const open = /@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/g
  const blocks: string[] = []
  let still = ''
  let at = 0
  for (let match = open.exec(css); match; match = open.exec(css)) {
    still += css.slice(at, match.index)
    let depth = 1
    let end = match.index + match[0].length
    while (depth > 0 && end < css.length) {
      if (css[end] === '{') depth += 1
      else if (css[end] === '}') depth -= 1
      end += 1
    }
    blocks.push(css.slice(match.index, end))
    at = end
    open.lastIndex = end
  }
  return { still: still + css.slice(at), blocks }
}


describe('the box (FR-001, S1.1)', () => {
  test('FR-001 S1.1 the Fintech AI card shows the replay after its claims and before its diagram, sources and tags', () => {
    expect(REPLAY_TOPIC).toBe('Fintech AI')
    const band = src('components', 'home', 'Hopper.astro')
    const claims = band.indexOf('<HopperClaim item={item} />')
    const at = band.indexOf('{topic.name === REPLAY_TOPIC && <OfferReplay />}')
    expect(claims).toBeGreaterThan(0)
    expect(at).toBeGreaterThan(claims)
    expect(at).toBeLessThan(band.indexOf('<HopperFigure'))
    expect(at).toBeLessThan(band.indexOf('<Sources sources={sourcesOf(topic.items'))
  })

  test("FR-001 S5.4 the box's sizes are in the page's own styles, so nothing shifts when the player loads", () => {
    const css = noComments(src('styles', 'ds', 'components.css'))
    expect(css).toMatch(/\.r-phone \{[^}]*max-width: 21rem;/)
    expect(css).toMatch(/\.r-stage--moving \.r-phone \{\s*height: 37\.25rem;\s*\}/)
    expect(css).toMatch(/\.r-stage--moving \.r-trace \{\s*height: 28rem;\s*\}/)
    expect(css).toMatch(/@media \(min-width: 60rem\) \{\s*\.r-stage \{\s*grid-template-columns: 21rem minmax\(0, 1fr\);\s*\}\s*\.r-stage--moving \.r-trace \{\s*height: 37\.25rem;/)
    expect(css).toMatch(/\.replay:not\(\.is-ready\) \.replay__controls \{\s*visibility: hidden;\s*\}/)
    expect(css).toMatch(/\.replay__button \{[^}]*min-width: 2\.75rem;\s*min-height: 2\.75rem;/)
  })
})

describe('loading (FR-003, S5.2)', () => {
  test('FR-003 S5.2 the one module loads the player with a dynamic import as the replay comes within 600 px', () => {
    const module = src('components', 'previews', 'PreviewLink.astro')
    expect(module).toContain("import '../replay/load.client.ts'")
    const loader = replay('load.client.ts')
    expect(loader).toContain("import('./player.ts')")
    expect(loader).toContain("rootMargin: '600px 0px'")
    expect(loader).toContain('near.disconnect()')
  })

  test("FR-003 S5.2 the player links its own stylesheet by URL, so it's never in the page's styles", () => {
    const player = replay('player.ts')
    expect(player).toContain("import styles from '../../styles/replay.css?url'")
    expect(player).not.toMatch(/import ['"][^'"]+\.css['"]/)
    for (const file of ['player.ts', 'load.client.ts', 'render.ts', 'replay.ts', 'OfferReplay.astro', 'ReplayFrame.astro'])
      expect(replay(file), file).not.toMatch(/from ['"](?:react|react-dom|motion)(?:\/[\w-]+)?['"]|<script\b|client:/)
  })

  test('FR-004 S2.3 S1.3 the player plays at 15% in view with the tab shown, and loops after a 5 s hold', () => {
    const player = replay('player.ts')
    expect(player).toContain('entry.isIntersecting && entry.intersectionRatio >= 0.15')
    expect(player).toContain("document.addEventListener('visibilitychange', update)")
    expect(player).toContain('!document.hidden')
    expect(player).not.toContain('matchMedia')
    expect(src('styles', 'replay.css')).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.r-stage \{\s*--r-still: 1;/)
    expect(player).toMatch(/loop: 5000/)
  })
})

describe('motion (FR-006, S2.6)', () => {
  test('FR-006 S2.6 MA-29–MA-32 run only with motion allowed, at their durations, and none is infinite', () => {
    const { still, blocks } = split(noComments(src('styles', 'replay.css')))
    expect(still).not.toMatch(/@keyframes|\banimation(?:-name)?\s*:|\btransition(?:-property)?\s*:|scroll-behavior/)
    const motion = blocks.join('\n')
    expect(motion).not.toMatch(/infinite/)
    expect(motion).toMatch(/\.r-stage--moving \.r-msg,\s*\.r-stage--moving \.r-pills,\s*\.r-stage--moving \.r-who \{\s*animation: r-rise 350ms/)
    expect(motion).toMatch(/\.r-stage--moving \.r-ent,\s*\.r-stage--moving \.r-sec \{\s*animation: r-rise 300ms/)
    expect(motion).toMatch(/\.r-stage--moving \.r-typing span \{\s*animation: r-pulse 450ms ease-in-out 2 alternate;/)
    expect(motion).toMatch(/scroll-behavior: smooth/)
    expect(motion).toMatch(/@keyframes r-rise \{\s*from \{\s*opacity: 0;\s*transform: translateY\(6px\);/)
    const page = noComments(src('styles', 'replay-page.css'))
    expect(page).not.toMatch(/animation|transition|@keyframes/)
  })
})

describe('what is hidden and what is linked (FR-007, FR-008, S3.1–S3.3)', () => {
  test("FR-007 S3.1 on the home the phone and trace are hidden from screen readers and hold nothing focusable, and the label's link is not", () => {
    const frame = replay('ReplayFrame.astro')
    expect(frame).toContain('<div class="r-stage r-stage--moving" aria-hidden="true">')
    expect(frame).not.toMatch(/tabindex|<a\b|<button\b/)
    const box = replay('OfferReplay.astro')
    expect(box).toMatch(/<figcaption class="replay__label">\s*\{LABEL\}\{' '\}\s*<a class="replay__read" href=\{PAGE\}>\s*\{READ\}\s*<\/a>\s*<\/figcaption>/)
    expect(box.indexOf('data-replay-pause')).toBeLessThan(box.indexOf('data-replay-restart'))
    expect(box.indexOf('data-replay-restart')).toBeLessThan(box.indexOf('data-replay-path="accepts"'))
    for (const markup of [replay('render.ts')]) expect(markup).not.toMatch(/tabindex|<a\s|<button/)
  })

  test('FR-008 S3.2 S3.3 the page shows both finished frames from the same words, loads no player, and links back', () => {
    const page = src('pages', 'offer-agent.astro')
    expect(page).toContain('<DesignBase title={`${TITLE} · Brad Thome`} description={LABEL}>')
    expect(page).not.toMatch(/noindex=\{false\}|canonical=/)
    expect(page).toContain('finishedOf(path)')
    expect(page).toContain('<ReplayFrame done={done} />')
    expect(page).toContain('href="/#hopper-fintech-ai"')
    expect(page).not.toMatch(/OfferReplay|player\.ts|data-replay/)
    expect(page).toContain("getEntry('claims', 'hopper-fintech-ai-2')")
  })
})

describe('the claims (FR-009, S4.1–S4.5)', () => {
  const claims = parse(read('apps', 'site', 'content', 'claims.yaml')) as Record<string, { subject: string; topic?: string; text: string; visibility: string; order: number }>

  test('S4.1 S4.5 the four claims come through the export, word for word, in order after the first Fintech AI claim', () => {
    expect(read('apps', 'site', 'content', 'claims.yaml')).toMatch(/^# Written by pnpm content:export/)
    const first = claims['hopper-fintech-ai-1']
    expect(first).toBeDefined()
    let order = first?.order ?? 0
    for (const [id, text] of Object.entries(CLAIMS)) {
      const claim = claims[id]
      expect(claim, id).toMatchObject({ subject: 'hopper', topic: 'Fintech AI', text, visibility: 'public' })
      expect(claim?.order, id).toBe(order + 1)
      order += 1
    }
  })

  test("S4.2 FR-009 each claim's sparkle is named by a title made of its own words", () => {
    const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9.%-]+/g) ?? [])
    const titles = {
      'hopper-fintech-ai-2': 'AI sales agent for flight booking',
      'hopper-fintech-ai-3': 'Grounded in flight, traveler and offer data',
      'hopper-fintech-ai-4': 'LLM-as-judge eval gate',
      'hopper-fintech-ai-5': 'Lifted the attach rate by 12.6%',
    }
    for (const [id, title] of Object.entries(titles)) {
      expect(RECEIPT_TITLES[id], id).toBe(title)
      const held = words(CLAIMS[id as keyof typeof CLAIMS])
      for (const word of words(title)) expect(held, `${id}: ${word}`).toContain(word)
    }
  })

  test("S4.2 the card's tags gain LLM-as-judge and OpenTelemetry, each in one of its claims", () => {
    const tags = TOPICS['Fintech AI']?.tags ?? []
    expect([...tags]).toEqual(['Flight-shopping assistant', 'Generative offers', 'LLM-as-judge', 'OpenTelemetry'])
    const all = Object.values(claims)
      .filter((claim) => claim.topic === 'Fintech AI')
      .map((claim) => claim.text.toLowerCase())
      .join(' ')
    for (const tag of tags) expect(all, tag).toContain(tag.toLowerCase())
  })

  test("S4.4 FR-009 each new claim has a facts case asking its sparkle's question and citing it", () => {
    for (const [id, text] of Object.entries(CLAIMS)) {
      const found = CASES.find((item) => item.id === `facts-receipt-${id}`)
      expect(found, id).toBeDefined()
      expect(found?.suite).toBe('facts')
      expect(found?.question).toBe(`Tell me more about this: “${text}”`)
      expect(found?.expect.cites).toEqual([id])
    }
  })

  test('S4.4 the evals stay off, so this slice runs none (D244)', () => {
    expect(JSON.parse(read('apps', 'evals', 'settings.json'))).toMatchObject({ evals: 'off' })
  })
})

describe('everything else holds (S5.5, FR-012, FR-013)', () => {
  test('S5.5 FR-012 the CSP still allows scripts only from the site and its hashes, and connects only where it did', () => {
    const firebase = JSON.parse(read('firebase.json')) as { hosting: { headers: { headers: { key: string; value: string }[] }[] } }
    const policy = firebase.hosting.headers.flatMap((block) => block.headers).find((header) => header.key === 'Content-Security-Policy')?.value ?? ''
    const directive = (name: string) => (policy.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `)) ?? '').split(/\s+/).slice(1)
    expect(directive('script-src').filter((source) => !source.startsWith("'sha256-"))).toEqual(["'self'"])
    expect(directive('style-src').filter((source) => !source.startsWith("'sha256-"))).toEqual(["'self'"])
    expect(directive('connect-src')).toEqual(["'self'", 'https://gateway.umami.is', 'https://chat-api-568431230204.us-central1.run.app'])
    expect(directive('img-src')).toEqual([])
  })

  test('FR-013 the records, the plan and the charter carry the slice', () => {
    const plan = read('docs', 'plan.md')
    expect(plan).toMatch(/\| 5\.20 The offer agent, replayed \|/)
    for (const id of ['0254', '0255', '0256', '0257']) expect(read('docs', 'decisions', 'README.md')).toContain(`[${id}](${id}-`)
    expect(read('docs', 'charter.md')).toContain('One exception: an illustration may loop while it')
    expect(read('tests', '009', 'static', 'components.test.ts')).toContain('MA-29')
  })
})
