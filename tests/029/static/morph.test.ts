import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { PAGES, ROLES } from '../../../apps/site/src/components/home/roles.ts'
import { read, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 029's static checks: the morph's opt-in inside the no-preference and
// scripting queries, its names and timing, the one page that loads it, the
// switch's and topics' hooks, and the script's two listeners (D212).

const css = read(sitePath('src', 'styles', 'home', 'morph.css')).replace(/\/\*[\s\S]*?\*\//g, '')
const { still, blocks } = withoutMotionBlocks(css)
const motion = blocks.join('\n')
const script = read(sitePath('src', 'components', 'home', 'morph.client.ts'))
const code = script.replace(/^\s*\/\/.*$/gm, '')

/** The declarations of the first rule whose selector list holds a selector. */
function rule(selector: string): string {
  const at = motion.indexOf(selector)
  expect(at, selector).toBeGreaterThan(-1)
  const open = motion.indexOf('{', at)
  return motion.slice(open + 1, motion.indexOf('}', open))
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name)
    return statSync(file).isDirectory() ? sources(file) : [file]
  })
}

const SPRING = 'cubic-bezier(0.3, 1.32, 0.52, 1)'

describe('the opt-in (FR-002)', () => {
  test('S3.1 S3.3 FR-002 the transition is opted into only inside no-preference, then scripting: enabled', () => {
    expect(still).not.toMatch(/view-transition|@keyframes|animation/)
    expect(blocks).toHaveLength(1)
    expect(motion).toMatch(
      /^@media \(prefers-reduced-motion: no-preference\) \{\s*@media \(scripting: enabled\) \{\s*@view-transition \{\s*navigation: auto;\s*\}/,
    )
    expect(motion.match(/@view-transition/g)).toHaveLength(1)
  })

  test('S4.3 FR-002 only HomePage.astro, which draws / and the role pages, loads the morph', () => {
    const importers = sources(sitePath('src'))
      .filter((file) => /\.(astro|ts|tsx|css)$/.test(file))
      .filter((file) => /import ['"][^'"]*morph.css['"]/.test(read(file)))
      .map((file) => path.basename(file))
    expect(importers).toEqual(['HomePage.astro'])
  })
})

describe('the parts and their timing (story 1)', () => {
  test('S1.1–S1.6 FR-001 each part is named once', () => {
    const names = [...motion.matchAll(/view-transition-name:\s*([\w-]+)/g)].map((match) => match[1])
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(
      expect.arrayContaining([
        'hero-eyebrow',
        'hero-note',
        'hero-word-1',
        'hero-word-2',
        'hero-word-3',
        ...[1, 2, 3, 4, 5].map((n) => `hero-row-${n}`),
        'role-pill',
        'role-name-1',
        'role-name-2',
        'role-name-3',
        ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `hopper-topic-${n}`),
        'site-header',
        'chat-ask',
      ]),
    )
    expect(rule(".hero__roles .ds-roles__item[aria-current='page']")).toMatch(/view-transition-name: role-pill/)
    expect(rule('.hopper__topic {')).toMatch(/view-transition-class: hopper-topic/)
  })

  test('S1.1 S1.2 the mark slides on the spring over 360 ms, and fades in from the home over 200 ms', () => {
    expect(motion).toContain(`--morph-spring: ${SPRING};`)
    expect(rule('::view-transition-group(role-pill)')).toMatch(
      /animation-duration: 360ms;\s*animation-timing-function: var\(--morph-spring\);/,
    )
    expect(rule('::view-transition-new(role-pill):only-child')).toMatch(/animation: ds-morph-in 200ms var\(--ease-out-soft\) both;/)
  })

  test('S1.3 the eyebrow and note fade out over 110 ms, then in over 200 ms', () => {
    expect(rule('::view-transition-old(hero-eyebrow)')).toMatch(/animation: ds-morph-out 110ms var\(--ease-out-soft\) both;/)
    expect(rule('::view-transition-new(hero-eyebrow)')).toMatch(/animation: ds-morph-in 200ms var\(--ease-out-soft\) 110ms both;/)
    expect(motion).toMatch(/::view-transition-old\(hero-eyebrow\),\s*::view-transition-old\(hero-note\)/)
    expect(motion).toMatch(/::view-transition-new\(hero-eyebrow\),\s*::view-transition-new\(hero-note\)/)
  })

  test('S1.4 the words, rows and names relight in place over 200 ms, easing out', () => {
    expect(rule('::view-transition-group(role-name-3)')).toMatch(
      /animation-duration: 200ms;\s*animation-timing-function: var\(--ease-out-soft\);/,
    )
    for (const name of ['hero-word-1', 'hero-word-3', 'hero-row-1', 'hero-row-5', 'role-name-1'])
      expect(motion).toContain(`::view-transition-group(${name})`)
  })

  test('S1.5 the topics move on the spring over 420 ms', () => {
    expect(rule('::view-transition-group(*.hopper-topic)')).toMatch(
      /animation-duration: 420ms;\s*animation-timing-function: var\(--morph-spring\);/,
    )
  })

  test('S1.6 the rest swaps at once, and the header and floating button sit still above the morph', () => {
    expect(motion).toMatch(/::view-transition-old\(root\),\s*::view-transition-new\(root\) \{\s*animation: none;\s*\}/)
    expect(rule('::view-transition-group(chat-ask)')).toMatch(/z-index: 1;\s*animation: none;/)
    expect(motion).toMatch(/::view-transition-group\(site-header\),\s*::view-transition-group\(chat-ask\)/)
  })

  test('S1.3 S1.6 FR-001 the morph fades only its own snapshots; its keyframes move nothing', () => {
    expect(motion).toMatch(/@keyframes ds-morph-in \{\s*from \{\s*opacity: 0;\s*\}\s*\}/)
    expect(motion).toMatch(/@keyframes ds-morph-out \{\s*to \{\s*opacity: 0;\s*\}\s*\}/)
  })
})

describe('the markup hooks', () => {
  test('S1.1 S1.4 S4.2 the switch numbers each role and wraps its name, with the same label and link', () => {
    const roleSwitch = read(sitePath('src', 'components', 'ds', 'RoleSwitch.astro'))
    expect(roleSwitch).toContain('`ds-roles__item--${index + 1}`')
    expect(roleSwitch).toContain('<span class="ds-roles__name">{role.label}</span>')
    expect(roleSwitch).toContain("aria-current={role.current ? 'page' : undefined}")
  })

  test('S1.5 each topic carries its place in the claims’ order, whatever the page’s order', () => {
    const hopper = read(sitePath('src', 'components', 'home', 'Hopper.astro'))
    expect(hopper).toMatch(/const keys = storyOf\(claims\.map\(\(entry\) => \(\{ id: entry\.id, \.\.\.entry\.data \}\)\)\)\.topics/)
    expect(hopper).toContain('`hopper__topic--k${keys.indexOf(slug) + 1}`')
    expect(hopper).toContain("'hopper__topic', keyOf(topic.slug),")
  })
})

describe('the script (story 2, FR-003)', () => {
  test('S2.1 S2.3 FR-003 on a push to a role page it takes the old page to its top; anything else skips the morph', () => {
    const roles = code.match(/\/\^\\\/\(([\w|]+)\)\$\//)?.[1]?.split('|')
    expect(roles).toEqual(ROLES.map((role) => PAGES[role].href.slice(1)))
    expect(code).toMatch(/activation\?\.navigationType !== 'push'/)
    expect(code).toMatch(/viewTransition\.skipTransition\(\)/)
    expect(code).toMatch(/scrollTo\(\{ top: 0, behavior: 'instant' \}\)/)
  })

  test('S2.2 on a morph the role page’s hero lands at rest', () => {
    expect(code).toMatch(/document\.querySelector\('\.hero'\)\?\.getAnimations\(\{ subtree: true \}\)/)
    expect(code).toMatch(/animation\.finish\(\)/)
    expect(code).toMatch(/matches\(':active-view-transition'\)/)
  })

  test('S4.4 FR-005 it adds two listeners, no scroll handler and no storage, in the one module', () => {
    expect([...code.matchAll(/addEventListener\('(\w+)'/g)].map((match) => match[1])).toEqual(['pageswap', 'pagereveal'])
    expect(code).not.toMatch(/['"](?:scroll|scrollend|wheel)['"]|onscroll|Storage|cookie|matchMedia/)
    expect(read(sitePath('src', 'components', 'previews', 'PreviewLink.astro'))).toContain("import '../home/morph.client.ts'")
  })
})
