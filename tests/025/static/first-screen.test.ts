import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { PROOF } from '../../../apps/site/src/components/home/hero.ts'
import { slugOf } from '../../../apps/site/src/components/home/hopper.ts'
import * as roles from '../../../apps/site/src/components/home/roles.ts'
import { FILES, motionBlocks, read, rules, sitePath } from '../../010/helpers/hero.ts'

// Spec 025's static checks: the proof tiles against their claims, the tighter
// spacing, the Brisk keyframes inside the no-preference block, the settle
// step's size and shape, and the switch with no address (D204–D206).

interface Claim {
  subject: string
  topic?: string
  text: string
}

const claims = parse(read(FILES.claims)) as Record<string, Claim>
const css = read(FILES.heroCss)
const JOINING = new Set(['the', 'from', 'on', 'of', 'and', 'a', 'to', 'in', 'for', 'with'])
const settle = sitePath('src', 'components', 'home', 'hero.client.ts')

describe('the proof tiles (T1, D205)', () => {
  test('S2.1 FR-004 three tiles, in order, with their figures and labels', () => {
    expect(PROOF.map((tile) => [tile.figure, tile.label])).toEqual([
      ['5', "more partners adopted the reusable capability from Capital One Travel's purchase flow"],
      ['10+', 'partner products, including Frontier and Spirit'],
      ['Founding', "engineer on Hopper's Fintech AI team"],
    ])
  })

  test("S2.2 each tile names its claims, and every word but a joining word is held by its claims' text or subject", () => {
    expect(PROOF.map((tile) => tile.claims)).toEqual([
      ['hopper-disruption-assistance-1'],
      ['hopper-disruption-assistance-3'],
      ['hopper-role-and-dates-2'],
    ])
    for (const tile of PROOF) {
      const held = tile.claims.map((id) => {
        const claim = claims[id]
        expect(claim, id).toBeDefined()
        return `${claim?.text ?? ''} ${claim?.subject ?? ''}`.toLowerCase()
      })
      for (const term of tile.terms)
        expect(
          held.some((text) => text.includes(term.toLowerCase())),
          `${tile.figure}: ${term}`,
        ).toBe(true)
      for (const raw of `${tile.figure} ${tile.label}`.split(/\s+/)) {
        const word = raw.toLowerCase().replace(/[,.]$/, '')
        if (JOINING.has(word)) continue
        const bare = word.replace(/'s$/, '')
        expect(
          held.some((text) => text.includes(word) || text.includes(bare)),
          `${tile.figure}: ${word}`,
        ).toBe(true)
      }
    }
  })

  test('S2.3 each tile links its Hopper topic, and each topic has public claims', () => {
    expect(PROOF.map((tile) => `#hopper-${slugOf(tile.topic)}`)).toEqual([
      '#hopper-disruption-assistance',
      '#hopper-disruption-assistance',
      '#hopper-fintech-ai',
    ])
    for (const tile of PROOF)
      expect(
        Object.values(claims).some((claim) => claim.subject === 'hopper' && claim.topic === tile.topic),
        tile.topic,
      ).toBe(true)
    const hero = read(FILES.hero)
    expect(hero).toMatch(/aria-label="Highlights"/)
    expect(hero).toMatch(/href=\{`#hopper-\$\{slugOf\(tile\.topic\)\}`\}/)
    expect(hero).not.toMatch(/<Chips/)
  })
})

describe('the tighter first screen (T2)', () => {
  test("S3.1 FR-005 the hero's padding and gap are T2's, and the Hopper band's top margin is gone", () => {
    const { still } = motionBlocks(css)
    const hero = rules(still).find((rule) => rule.selectors.includes('.hero'))?.body ?? ''
    expect(hero).toMatch(/padding-top:\s*clamp\(1\.25rem,\s*2\.4vw,\s*2\.25rem\)/)
    expect(hero).toMatch(/padding-bottom:\s*clamp\(2rem,\s*3vw,\s*2\.75rem\)/)
    const text = rules(still).find((rule) => rule.selectors.includes('.hero__text'))?.body ?? ''
    expect(text).toMatch(/gap:\s*1\.25rem/)
    const hopper =
      rules(read(sitePath('src', 'styles', 'home', 'hopper.css'))).find((rule) => rule.selectors.includes('.hopper'))?.body ?? ''
    expect(hopper).not.toMatch(/margin-top/)
  })
})

describe('the Brisk sequence (MA-1–MA-4, D204)', () => {
  test('FR-001 S1.7 every keyframe and animation sits inside the no-preference block', () => {
    const { still, blocks } = motionBlocks(css)
    expect(still).not.toMatch(/@keyframes|animation/)
    const motion = blocks.join('\n')
    for (const name of ['hero-word-rise', 'hero-word-ink', 'hero-dot', 'hero-row', 'hero-layer', 'hero-sheen', 'hero-rise']) {
      expect(motion, name).toMatch(new RegExp(`@keyframes ${name}\\b`))
    }
    expect(motion).toMatch(/cubic-bezier\(0\.3,\s*1\.32,\s*0\.52,\s*1\)/)
  })

  test('FR-002 FR-003 S1.6 no keyframe changes opacity, filter, visibility or layout, and the sheen is a pseudo-element', () => {
    const motion = motionBlocks(css).blocks.join('\n')
    const frames = [...motion.matchAll(/@keyframes [\w-]+\s*\{([\s\S]*?)\n {2}\}/g)].map((match) => match[1] ?? '')
    expect(frames.length).toBeGreaterThanOrEqual(7)
    for (const body of frames) {
      const properties = [...body.matchAll(/([\w-]+)\s*:/g)].map((match) => match[1])
      for (const property of properties) expect(['transform', 'color', 'border-color'], property).toContain(property)
    }
    expect(motion).toMatch(/\.hero__row::before\s*\{[^}]*animation:\s*hero-sheen/)
  })
})

describe('the deep-link settle (T8, D204)', () => {
  test('FR-007 the one module imports the settle step, which finishes the hero and adds no scroll handler', () => {
    const source = read(settle)
    expect(source).toMatch(/getAnimations\(\{ subtree: true \}\)/)
    expect(source).toMatch(/\.finish\(\)/)
    expect(source).toMatch(/location\.hash/)
    expect(source).not.toMatch(/['"]scroll['"]/)
    expect(Buffer.byteLength(source.replace(/^\s*\/\/.*$/gm, '').replace(/\s+/g, ' '))).toBeLessThan(512)
    expect(read(sitePath('src', 'components', 'previews', 'PreviewLink.astro'))).toMatch(/import '\.\.\/home\/hero\.client\.ts'/)
  })
})

describe('the switch under the hero, with no address (T10, D206)', () => {
  test('S6.1 FR-008 the switch lists the three roles under "Tailor this page", with no "Any role"', () => {
    expect(roles.SWITCH).toEqual({ label: 'Tailor this page' })
    expect(roles.switchOf('all')).toEqual([
      { label: 'Mobile', href: '/mobile', current: false },
      { label: 'Full-stack', href: '/fullstack', current: false },
      { label: 'Applied AI', href: '/ai', current: false },
    ])
    expect(roles.switchOf('ai').map((link) => link.current)).toEqual([false, false, true])
  })

  test('S6.1 the page opens on the header and the hero, and the hero renders the switch after its tiles', () => {
    const page = read(FILES.page)
    expect(page).toMatch(/<Header sections=\{sections\} \/>\s*<main id="main">\s*<Hero role=\{role\} \/>/)
    expect(page).not.toMatch(/RoleSwitch|home-roles/)
    const hero = read(FILES.hero)
    expect(hero).toMatch(
      /<\/ul>\s*<div class="hero__roles">\s*<RoleSwitch quiet roles=\{switchOf\(role\)\} label=\{SWITCH\.label\} \/>\s*<\/div>\s*<Ask role=\{role\} \/>/,
    )
  })

  test('S6.3 SC-004 RoleSwitch takes no address, and no source shows the mono address beside a switch', () => {
    expect('addressOf' in roles).toBe(false)
    const roleSwitch = read(sitePath('src', 'components', 'ds', 'RoleSwitch.astro'))
    expect(roleSwitch).not.toMatch(/address|ds-roles__url/)
    const files = readdirSync(sitePath('src'), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(astro|ts|css)$/.test(entry.name))
      .map((entry) => path.join(entry.parentPath, entry.name))
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/ds-roles__url|address="bradthome\.com/)
  })
})
