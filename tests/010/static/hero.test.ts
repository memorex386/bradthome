import { readdirSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { ACTIONS, EYEBROW, LAYERS, LINES, PLACE, PROOF, WORDS } from '../../../apps/site/src/components/home/hero.ts'
import { FILES, motionBlocks, ms, read, rules } from '../helpers/hero.ts'

// Spec 010's static checks: the hero's words, its facts against the public
// claims, and its motion as hero.css writes it (D124–D128). Spec 025 amended
// them: the Brisk pace (D204), the proof tiles in place of the chips (D205),
// and the hover transitions MA-5 and MA-19 add.

interface Claim {
  subject: string
  text: string
  visibility: string
}

const claims = (): Record<string, Claim> => parse(read(FILES.claims)) as Record<string, Claim>

describe('the words', () => {
  test("FR-003 S1.1 the heading's words and the two lines are D124's, word for word", () => {
    expect(WORDS.map((word) => word.text)).toEqual(['Mobile', 'Full-stack', 'Applied AI'])
    expect(WORDS.map((word) => word.role)).toEqual(['mobile', 'fullstack', 'ai'])
    expect(LINES).toEqual(['I build Android, iOS and web products end to end.', 'Fast with AI agents, careful with production.'])
    const hero = read(FILES.hero)
    expect(hero).toMatch(/<h1 id="hero-heading"[^>]*>[\s\S]*WORDS\.map[\s\S]*hero__stop">\.<\/span>\s*<span class="hero__dot" aria-hidden="true" \/>[\s\S]*<\/h1>/)
    expect(hero).toMatch(/LINES\.map/)
  })

  test('FR-002 S5.2 S1.1 the eyebrow names the role, then Dallas–Fort Worth, and each role page can pass its own', () => {
    expect(EYEBROW).toEqual({
      all: 'Senior mobile & full-stack engineer',
      mobile: 'Senior mobile engineer',
      fullstack: 'Senior full-stack engineer',
      ai: 'Senior engineer · Applied AI',
    })
    expect(PLACE).toBe('Dallas–Fort Worth')
    const hero = read(FILES.hero)
    expect(hero).toMatch(/role\?: Role/)
    expect(hero).toMatch(/const \{ role = 'all' \} = Astro\.props/)
    expect(hero).toMatch(/\{EYEBROW\[role\]\} · \{PLACE\}/)
  })

  test("FR-006 S4.2 the buttons go to the Hopper story (spec 011) and the page's résumé PDF, which spec 015 sets (D141)", () => {
    expect(ACTIONS.work).toEqual({ label: 'See the work at Hopper', href: '#hopper' })
    expect(ACTIONS.resume).toEqual({ label: 'Read the résumé' })
    expect(read(FILES.hero)).toMatch(/href=\{resumeHrefOf\(role\)\}/)
    expect(read(FILES.page)).toMatch(/<Hero role=\{role\} \/>\s*<Hopper role=\{role\} \/>/)
  })
})

describe('the facts', () => {
  test('S5.1 FR-007 SC-005 every proof tile (spec 025) and row names public claims that hold each of its terms', () => {
    const all = claims()
    const facts = [...PROOF, ...LAYERS]
    expect(PROOF.map((tile) => tile.figure)).toEqual(['5', '10+', 'Founding'])
    expect(LAYERS.map((layer) => layer.name)).toEqual(['Android', 'iOS', 'Web', 'Services', 'AI'])
    for (const fact of facts) {
      expect(fact.claims.length, fact.label).toBeGreaterThan(0)
      expect(fact.terms.length, fact.label).toBeGreaterThan(0)
      const texts = fact.claims.map((id) => {
        const claim = all[id]
        expect(claim, `${fact.label}: ${id}`).toBeDefined()
        expect(claim?.visibility, `${fact.label}: ${id}`).toBe('public')
        return `${claim?.text ?? ''} ${claim?.subject ?? ''}`.toLowerCase()
      })
      for (const term of fact.terms)
        expect(
          texts.some((text) => text.includes(term.toLowerCase())),
          `${fact.label}: ${term}`,
        ).toBe(true)
    }
  })

  test("S5.1 FR-007 each row's places are the subjects of its claims", () => {
    const all = claims()
    const names: Record<string, string> = {
      hopper: 'Hopper',
      'bleacher-report': 'Bleacher Report',
      'bottle-rocket': 'Bottle Rocket',
      vindecoded: 'VINDecoded',
    }
    for (const layer of LAYERS) {
      const subjects = new Set(layer.claims.map((id) => names[all[id]?.subject ?? ''] ?? '?'))
      for (const subject of subjects) expect(layer.where, layer.name).toContain(subject)
    }
  })

  test('S5.1 FR-007 the page fails to build when a named claim is missing', () => {
    const hero = read(FILES.hero)
    expect(hero).toMatch(/for \(const fact of \[\.\.\.PROOF, \.\.\.LAYERS\]\)/)
    expect(hero).toMatch(/if \(!\(await getEntry\('claims', id\)\)\) throw new Error/)
  })
})

/** Each animated part of the hero, as the selectors whose rules set its animation. */
const PARTS: Record<string, string[]> = {
  word1: ['.hero__word'],
  word2: ['.hero__word', '.hero__word--2'],
  word3: ['.hero__word', '.hero__word--3'],
  dot: ['.hero__dot'],
  line1: ['.hero__line', '.hero__line--1'],
  line2: ['.hero__line', '.hero__line--2'],
  actions: ['.hero__actions'],
  roles: ['.hero__roles'],
  proof: ['.hero__proof'],
  row1: ['.hero__row', '.hero__row--1'],
  row2: ['.hero__row', '.hero__row--2'],
  row3: ['.hero__row', '.hero__row--3'],
  layer1: ['.hero__row .hero__layer', '.hero__row--1 .hero__layer'],
  layer2: ['.hero__row .hero__layer', '.hero__row--2 .hero__layer'],
  layer3: ['.hero__row .hero__layer', '.hero__row--3 .hero__layer'],
}

/** Each part's delay and duration, from hero.css's motion block. */
function timings(): Record<string, { delay: number; duration: number }> {
  const vars = { '--duration-intro': 650 }
  const block = motionBlocks(read(FILES.heroCss)).blocks.join('\n')
  const found: Record<string, { delay: number; duration: number }> = {}
  for (const [part, chain] of Object.entries(PARTS)) {
    let delay = 0
    let duration = Number.NaN
    for (const rule of rules(block)) {
      if (!rule.selectors.some((selector) => chain.includes(selector))) continue
      const shorthand = /(?:^|;)\s*animation:\s*([^;]+)/.exec(rule.body)?.[1]
      if (shorthand) {
        const first = shorthand.split(',')[0] ?? ''
        const times = first.match(/var\(--duration-[\w-]+\)|\b\d+(?:\.\d+)?m?s\b/g) ?? []
        duration = ms(times[0] ?? 'x', vars)
        delay = times[1] === undefined ? 0 : ms(times[1], vars)
      }
      const own = /animation-delay:\s*([^;,]+)/.exec(rule.body)?.[1]
      if (own) delay = ms(own, vars)
    }
    found[part] = { delay, duration }
  }
  return found
}

describe('the motion', () => {
  // Spec 025 (D204) moved these from the Story pace to the Brisk one; its own
  // tests read the running animations against the motion table.
  test('S2.1 FR-004 SC-003 the words start 300 ms apart and each lands over 520 ms (spec 025, D204)', () => {
    const t = timings()
    expect([t.word1, t.word2, t.word3]).toEqual([
      { delay: 0, duration: 520 },
      { delay: 300, duration: 520 },
      { delay: 600, duration: 520 },
    ])
    expect(read(FILES.heroCss)).toMatch(/\.hero__word \{\s*animation:\s*hero-word-rise 520ms var\(--hero-spring\) both,\s*hero-word-ink 520ms/)
  })

  test('S2.2 FR-004 each row runs 140 ms after its word for 700 ms, and the first dot pops at 286 ms (spec 025)', () => {
    const t = timings()
    for (const [index, start] of [140, 440, 740].entries()) {
      expect(t[`row${index + 1}`]).toEqual({ delay: start, duration: 700 })
      expect(t[`layer${index + 1}`]).toEqual({ delay: start, duration: 700 })
    }
    expect(t.dot).toEqual({ delay: 286, duration: 520 })
  })

  test('S2.3 FR-004 SC-003 the lines, buttons, switch and tiles rise at the Brisk pace, and all is at rest by 1,600 ms (spec 025)', () => {
    const t = timings()
    expect(t.line1).toEqual({ delay: 760, duration: 540 })
    expect(t.line2).toEqual({ delay: 880, duration: 540 })
    expect(t.actions).toEqual({ delay: 1000, duration: 540 })
    expect(t.roles).toEqual({ delay: 1060, duration: 540 })
    expect(t.proof).toEqual({ delay: 1060, duration: 540 })
    const end = Math.max(...Object.values(t).map((part) => part.delay + part.duration))
    expect(end).toBe(1600)
  })

  test('S3.1 S2.4 FR-004 every keyframe and animation sits in the no-preference query, plays once and never loops', () => {
    const css = read(FILES.heroCss)
    const { still, blocks } = motionBlocks(css)
    expect(blocks).toHaveLength(1)
    // Spec 025's hover (MA-5, MA-19) adds transitions, only inside the no-preference query.
    expect(still).not.toMatch(/@keyframes|\banimation(?:-[a-z]+)?\s*:|\btransition(?:-[a-z]+)?\s*:/)
    expect(blocks[0]).not.toMatch(/infinite|animation-iteration-count|alternate/)
  })

  test('S1.3 SC-004 FR-004 the keyframes change only colors and transforms, never opacity, blur or layout (D126)', () => {
    const block = motionBlocks(read(FILES.heroCss)).blocks[0] ?? ''
    const keyframes = [...block.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)]
    expect(keyframes.map((match) => match[1])).toEqual(['hero-word-rise', 'hero-word-ink', 'hero-dot', 'hero-row', 'hero-layer', 'hero-sheen', 'hero-rise'])
    for (const [, name, body] of keyframes) {
      for (const [, property] of (body ?? '').matchAll(/([a-z-]+)\s*:/g)) {
        expect(['color', 'transform', 'background-color', 'border-color'], `${name}: ${property}`).toContain(property)
      }
    }
    expect(block).not.toMatch(/opacity|filter|blur/)
  })

  test('FR-005 S2.4 the hero and its page ship no script, no style attribute and no request to another host', () => {
    for (const file of [FILES.hero, FILES.page]) {
      const text = read(file)
      expect(text, file).not.toMatch(/<script\b|client:|\bstyle=|set:html/)
      const hosts = [...text.matchAll(/https?:\/\/([^/'"\s]+)/g)].map((match) => match[1])
      expect(hosts, file).toEqual([])
    }
  })
})

describe('the page', () => {
  test('FR-001 S6.3 the home is the hero on the design system layout, with the Hopper story, and no noindex meta tag (D162)', () => {
    const page = read(FILES.page)
    expect(page).toMatch(/import DesignBase from '\.\.\/\.\.\/layouts\/DesignBase\.astro'/)
    // Spec 014: the home, role 'all', is the one page without noindex.
    expect(page).toMatch(/<DesignBase [^>]*noindex=\{role !== 'all'\}/)
    expect(read(path.join(FILES.pages, 'index.astro'))).toMatch(/<HomePage role="all" \/>/)
    expect(page).toMatch(/<Header /)
    expect(page).toMatch(/<Hero role=\{role\} \/>/)
    // Spec 027: the home and role pages' footer takes `built`, its line about how the site is built (D210).
    expect(page).toMatch(/<Footer built \/>/)
    expect(page).toMatch(/<a class="ds-skip" href="#main">/)
  })

  test('FR-001 S6.2 no page in the source links /v2', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? files(path.join(dir, entry.name))
          : /\.(?:astro|mdx?|ts)$/.test(entry.name)
            ? [path.join(dir, entry.name)]
            : [],
      )
    for (const file of files(FILES.src)) expect(read(file), file).not.toMatch(/href=["'{`]*\/v2\b/)
  })
})
