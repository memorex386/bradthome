import { describe, expect, test } from 'vitest'
import { COPIED_FOR } from '../../../apps/site/src/components/ds/contact.ts'
import { read, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 028's static checks: the blocks that reveal, every pose and
// animation inside the no-preference block, only translate, scale and color
// moving, the script's one observer and no scroll listener, the figures'
// permanent rule, and the copy's timing (D211).

const home = (name: string): string => read(sitePath('src', 'components', 'home', name))
const ds = (name: string): string => read(sitePath('src', 'components', 'ds', name))
const script = home('reveal.client.ts')
const css = read(sitePath('src', 'styles', 'ds', 'components.css')).replace(/\/\*[\s\S]*?\*\//g, '')
const { still, blocks } = withoutMotionBlocks(css)
const motion = blocks.join('\n')

/** Each @keyframes rule's name and body in a stylesheet, braces matched. */
function keyframes(source: string): Map<string, string> {
  const found = new Map<string, string>()
  const open = /@keyframes\s+([\w-]+)\s*\{/g
  for (let match = open.exec(source); match !== null; match = open.exec(source)) {
    let depth = 1
    let at = match.index + match[0].length
    while (at < source.length && depth > 0) {
      if (source[at] === '{') depth += 1
      else if (source[at] === '}') depth -= 1
      at += 1
    }
    found.set(match[1] ?? '', source.slice(match.index + match[0].length, at - 1))
  }
  return found
}

describe('the blocks that reveal (FR-001)', () => {
  test('S1.1 S1.2 S1.4 S2.3 FR-001 the section heads, cards, timeline and address carry data-reveal', () => {
    expect(home('Hopper.astro')).toMatch(/<header class="hopper__head" data-reveal="head">/)
    expect(home('Hopper.astro')).toMatch(/'hopper__topic'[^>]*\]\} data-reveal="card">/)
    expect(home('Experience.astro')).toMatch(/<header class="experience__head" data-reveal="head">/)
    expect(home('Experience.astro')).toMatch(/<ol class="experience__timeline"[^>]*data-reveal="card">/)
    expect(home('Experience.astro').match(/data-reveal="card"/g)).toHaveLength(3)
    expect(home('Side.astro')).toMatch(/<header class="side__head" data-reveal="head">/)
    expect(home('Side.astro')).toMatch(/data-reveal="card"/)
    expect(home('Contact.astro')).toMatch(/<h2 id="contact-heading" class="ds-heading" data-reveal="head">/)
    expect(home('Contact.astro')).toMatch(/<Email reveal \/>/)
    expect(ds('Email.astro')).toMatch(/data-reveal=\{reveal \? 'addr' : undefined\}/)
  })

  test('S5.5 FR-005 the gallery and other pages have no blocks that reveal', () => {
    for (const name of ['design-system.astro', 'evals.astro', 'privacy.astro']) {
      expect(read(sitePath('src', 'pages', name)), name).not.toMatch(/data-reveal/)
    }
  })

  test('S6.5 FR-006 the reveal is in the one module', () => {
    expect(read(sitePath('src', 'components', 'previews', 'PreviewLink.astro'))).toMatch(/import '\.\.\/home\/reveal\.client\.ts'/)
  })
})

describe('the script (FR-006, S6.4)', () => {
  test('S6.4 FR-006 reveal.client.ts uses one IntersectionObserver at 0 and 18%, and never listens for scroll', () => {
    expect(script.match(/new IntersectionObserver\(/g)).toHaveLength(1)
    expect(script).toMatch(/threshold: \[0, 0\.18\], rootMargin: '0px 0px 20px 0px'/)
    expect(script).not.toMatch(/['"](scroll|scrollend|wheel)['"]/)
    expect(script).not.toMatch(/onscroll|requestAnimationFrame/)
  })

  test('S5.4 FR-006 under reduced motion the script does nothing', () => {
    // The CSS sets --rv-motion only inside no-preference; spec 003's lock keeps matchMedia out of the site's scripts.
    expect(script).toMatch(/allowed\('--rv-motion'\)/)
    expect(motion).toMatch(/:root \{\s*--rv-motion: 1;/)
    expect(still).not.toMatch(/--rv-motion/)
  })

  test('S5.2 FR-001 a block that plays is no longer watched, so it plays once', () => {
    expect(script).toMatch(/intersectionRatio >= 0\.18\) \{\s*watch\.unobserve\(block\)/)
  })

  test('S4.1 S4.2 FR-004 the light uses one passive pointermove listener, on pointer devices only', () => {
    expect(script.match(/addEventListener\(/g)).toHaveLength(1)
    expect(script).toMatch(/allowed\('--rv-hover'\)/)
    expect(motion).toMatch(/@media \(hover: hover\) \{\s*:root \{\s*--rv-hover: 1;/)
    expect(script).toMatch(/'pointermove'[\s\S]*\{ passive: true \}/)
  })
})

describe('the motion (FR-005, FR-006)', () => {
  test('S5.4 FR-006 every pose and reveal sits inside no-preference', () => {
    expect(still).not.toMatch(/data-rv=/)
    expect(still).not.toMatch(/ds-rv-/)
    expect(motion).toMatch(/\[data-rv='pre'\]/)
    expect(motion).toMatch(/\[data-rv='go'\]/)
  })

  // Amended by spec 038 (D229): the markers are gone, and their pop with them (MA-11), so its keyframes are too.
  test('S5.6 FR-005 the reveal keyframes move only translate, scale and color, never opacity or filter', () => {
    const found = keyframes(motion)
    const names = ['ds-rv-rise', 'ds-rv-ink', 'ds-rv-draw']
    expect([...found.keys()].filter((name) => name.startsWith('ds-rv-')).sort()).toEqual([...names].sort())
    for (const name of names) {
      const body = found.get(name)
      expect(body, name).toBeDefined()
      const properties = [...(body ?? '').matchAll(/([\w-]+)\s*:/g)].map((match) => match[1])
      for (const property of properties) expect(['translate', 'scale', 'color'], `${name} ${property}`).toContain(property)
    }
  })

  test('S1.5 FR-005 the pose only moves or mutes', () => {
    const poses = [...motion.matchAll(/\[data-rv='pre'\][^{]*\{([^}]*)\}/g)].map((match) => match[1] ?? '')
    expect(poses.length).toBeGreaterThan(0)
    for (const pose of poses) {
      for (const [, property] of pose.matchAll(/([\w-]+)\s*:/g)) expect(['translate', 'scale', 'color']).toContain(property)
    }
  })

  // Amended by spec 038 (D229, D230): MA-11's markers are gone, and the claims' sparkles don't pop: nothing poses or
  // plays them, and the script numbers only a block's bars and figures.
  test('SC-001 FR-001 the reveal timings are the brief’s', () => {
    expect(motion).toMatch(/\.ds-eyebrow \{\s*--rv-y: 10px;\s*animation: ds-rv-rise 480ms var\(--ease-out-soft\) backwards;/)
    expect(motion).toMatch(/--rv-y: 14px;\s*animation:\s*ds-rv-rise 600ms var\(--ease-out-soft\) 70ms backwards,\s*ds-rv-ink 600ms/)
    expect(motion).toMatch(/--rv-y: 18px;\s*animation: ds-rv-rise 560ms var\(--ease-out-soft\) var\(--rv-d, 0ms\) backwards;/)
    expect(motion).not.toMatch(/ds-rv-pop|\.ds-marker|\[data-rv='(?:pre|go)'\][^{]*\.ds-claim/)
    expect(motion).toMatch(/ds-rv-draw 640ms var\(--ease-out-soft\) calc\(var\(--rv-d, 0ms\) \+ 120ms \+ var\(--rv-i, 0\) \* 70ms\)/)
    expect(motion).toMatch(/ds-rv-draw 680ms var\(--ease-out-soft\) calc\(var\(--rv-d, 0ms\) \+ 100ms \+ var\(--rv-i, 0\) \* 90ms\)/)
    expect(motion).toMatch(/ds-rv-draw 760ms var\(--ease-out-soft\) 100ms backwards/)
    expect(script).toMatch(/card\+\+ \* 90/)
    expect([...script.matchAll(/number\(block, '([^']+)'/g)].map((match) => match[1])).toEqual(['.experience__span', '.ds-stat'])
  })
})

describe('the rules and the copy (T7, MA-17)', () => {
  // Amended by spec 038 (D229): a linked stat adds a second dd for its source's host, so the rule, and MA-14's draw of
  // it, are the figure's, the first dd's. The host gets none.
  test('S2.1 FR-002 every figure carries a permanent 3 px accent rule, outside the motion block', () => {
    expect(still).toMatch(/\.ds-stat dd:first-of-type::after \{[^}]*height: 3px;[^}]*background: var\(--color-accent\);/)
    expect(css).not.toMatch(/\.ds-stat dd::after/)
    expect(motion).toMatch(/\[data-rv='go'\] \.ds-stat dd:first-of-type::after \{\s*animation: ds-rv-draw 680ms/)
  })

  test('S2.3 FR-002 the address keeps a 2 px rule in its color, drawn as a pseudo-element', () => {
    expect(ds('Email.astro')).toMatch(/<span class="ds-email__text">\{EMAIL\}<\/span>/)
    expect(still).toMatch(/\.ds-email__text::after \{[^}]*height: 2px;[^}]*background: currentColor;/)
  })

  test('S3.1 FR-003 "Copied" holds for 2.6 s, on Brad’s Gate 1 card', () => {
    expect(COPIED_FOR).toBe(2600)
  })

  test('S3.1 S3.3 S3.4 FR-003 the copy button holds a check that draws only with motion allowed', () => {
    expect(ds('Icon.astro')).toMatch(/check: '/)
    expect(ds('Email.astro')).toMatch(/<Icon name="copy" \/>\s*<Icon name="check" \/>/)
    expect(still).toMatch(/\.ds-email\[data-state='copied'\] \.ds-email__icons > svg \+ svg path \{\s*stroke-dashoffset: 0;/)
    expect(motion).toMatch(/transition: stroke-dashoffset 300ms/)
    expect(motion).toMatch(/\.ds-email__label \{\s*transition: translate 220ms/)
  })

  test('S4.1 S4.2 FR-004 the cards’ light shows only on pointer devices with motion allowed, as a layer under the text', () => {
    const light = motion.slice(motion.indexOf('@media (hover: hover) {'))
    expect(light).toMatch(/\.ds-card\[data-reveal\] \{\s*background-image: radial-gradient\(\s*24rem circle at var\(--mx, 50%\) var\(--my, -40%\)/)
    expect(light).toMatch(/@media \(hover: hover\) and \(scripting: enabled\) \{\s*\.ds-card\[data-reveal\] \{/)
    expect(light).toMatch(/transition: --rv-glow 300ms/)
    expect(light).toMatch(/\.ds-card\[data-reveal\]:hover \{\s*--rv-glow: 1;/)
    expect(still).not.toMatch(/\.ds-card\[data-reveal\]/)
  })
})
