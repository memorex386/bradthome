import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { anchorOf, ASK, SOURCES_LABEL } from '../../../apps/site/src/components/ds/proof.ts'
import { componentSources, designSources, FILES, read, withoutMotionBlocks } from '../helpers/ds.ts'

// The components, the layout and the gallery, read as text (FR-003 to
// FR-009, FR-011 to FR-013, S5.1, S5.2). The browser tests check behavior.

const component = (name: string): string => read(path.join(FILES.componentsDir, `${name}.astro`))

describe('the components', () => {
  // Amended by spec 038 (D229, D230): the receipts' drawer and marker are retired. A claim's sparkle, its last words and
  // a card's sources take their place, beside the stat that now links its source.
  test('FR-003 FR-004 FR-005 FR-006 FR-007 each component Home v2 and its proof need has its file, and the receipts’ are gone', () => {
    const names = componentSources().map((source) => source.file)
    for (const name of [
      'Header',
      'Footer',
      'Button',
      'Chips',
      'RoleSwitch',
      'Card',
      'Eyebrow',
      'Stats',
      'ClaimAsk',
      'ClaimText',
      'Sources',
      'AskButton',
      'Icon',
    ]) {
      expect(names, name).toContain(`${name}.astro`)
    }
    for (const name of ['Receipts.astro', 'ReceiptMarker.astro', 'receipts.ts'])
      expect(existsSync(path.join(FILES.componentsDir, name)), name).toBe(false)
  })

  // Amended by spec 036 (D227): the profiles are their logos, from profiles.ts, and stay beside the menu on a phone.
  test("FR-003 the header names its regions, links Brad's profiles, and folds into a native disclosure on a phone", () => {
    const header = component('Header')
    expect(header).toMatch(/aria-label="Sections"/)
    expect(header).toMatch(/aria-label="Elsewhere"/)
    expect(header).toMatch(/href=\{GITHUB\.href\}/)
    expect(header).toMatch(/href=\{LINKEDIN\.href\}/)
    const profiles = read(path.join(FILES.componentsDir, 'profiles.ts'))
    expect(profiles).toContain("'https://github.com/memorex386'")
    expect(profiles).toContain("'https://www.linkedin.com/in/brad-thome/'")
    expect(header).toMatch(/<details class="ds-header__menu">\s*<summary[^>]*aria-label="Menu"/)
    expect(component('Footer')).toMatch(/<a href="\/">Brad Thome<\/a> · Dallas–Fort Worth/)
  })

  test('FR-004 buttons, chips, cards, the eyebrow and the stat have each variant, and links have their three styles', () => {
    expect(component('Button')).toMatch(/'primary' \| 'secondary' \| 'accent' \| 'icon'/)
    expect(component('Chips')).toMatch(/'highlight' \| 'tag'/)
    expect(component('Card')).toMatch(/'plain' \| 'feature' \| 'soft'/)
    expect(component('Card')).toMatch(/highlight\?: boolean/)
    expect(component('Eyebrow')).toMatch(/'muted' \| 'accent'/)
    expect(component('Stats')).toMatch(/<dl class="ds-stats">/)
    const css = read(FILES.components)
    for (const name of ['.ds-link', '.ds-link--quiet', '.ds-nav-link']) expect(css, name).toContain(`${name} {`)
  })

  test('FR-005 the role switch is a navigation region of links, with the current one marked', () => {
    const roles = component('RoleSwitch')
    // Spec 025 (D206): a quiet look joins the pill one, and no switch shows an address.
    expect(roles).toMatch(/<nav class:list=\{\['ds-roles', quiet && 'ds-roles--quiet'\]\}/)
    expect(roles).not.toMatch(/address|ds-roles__url/)
    expect(roles).toMatch(/<a\b[\s\S]*?href=\{role\.href\}/)
    expect(roles).toMatch(/aria-current=\{role\.current \? 'page' : undefined\}/)
    expect(roles).not.toMatch(/<button\b|aria-pressed/)
  })

  // Amended by spec 026 (D208): a card's receipts sit in one drawer, and a marker links its row there.
  // Amended by spec 038 (D229, D230): the drawer and the markers are gone. A card shows its proof at rest: a claim keeps
  // the anchor its row had and ends with the sparkle, kept to its last word, a stat links its source, and a labeled list
  // holds the card's other sources. Nothing is a disclosure.
  test('FR-006 a card’s proof shows at rest: each claim keeps its anchor and ends with its sparkle, a stat links its source, and a labeled list holds the rest', () => {
    expect(ASK).toEqual({ href: '#contact', tip: 'Ask about this' })
    expect(anchorOf('bookshout-2')).toBe('receipt-bookshout-2')
    const ask = component('ClaimAsk')
    expect(ask).toMatch(
      /<a\s+class:list=\{\['ds-claim-ask'[^>]*\s+href=\{ASK\.href\}\s+data-chat-ask=\{questionOf\(text\)\}\s+data-tip=\{ASK\.tip\}\s+aria-label=\{askNameOf\(title\)\}\s*>\s*<Icon name="sparkle" \/>\s*<\/a>/,
    )
    expect(component('ClaimText')).toMatch(/<span class="ds-claim__end">\s*\{last\}\s*<ClaimAsk\s+text=\{words\}\s+title=\{title\}/)
    for (const claim of ['HopperClaim.astro', 'SideClaim.astro']) {
      const source = read(path.join(FILES.componentsDir, '..', 'home', claim))
      expect(source, claim).toMatch(/'ds-claim'[^>]*\sid=\{anchorOf\(item\.id\)\}|ds-claim"\s+id=\{anchorOf\(item\.id\)\}/)
      expect(source, claim).toMatch(/<ClaimText\s+text=/)
    }
    const stats = component('Stats')
    expect(stats).toMatch(/<dd class="ds-stat__source">\s*<PreviewLink\s+class="ds-stat__link"\s+href=\{item\.href\}/)
    expect(stats).toMatch(/<a\s+class="ds-stat__link"\s+href=\{hrefOf\(item\.href\)\}\s*>/)
    expect(SOURCES_LABEL).toBe('Sources')
    const sources = component('Sources')
    expect(sources).toMatch(
      /<p class="ds-sources__label"\s+id=\{`\$\{id\}-label`\}>\s*\{SOURCES_LABEL\}\s*<\/p>\s*<ul class="ds-sources__list"\s+aria-labelledby=\{`\$\{id\}-label`\}>/,
    )
    expect(sources).toMatch(/<span class="ds-source__label">\s*\{source\.label\}\s*<\/span>/)
    for (const name of ['ClaimAsk', 'ClaimText', 'Stats', 'Sources']) expect(component(name), name).not.toMatch(/<details\b|<summary\b/)
    expect(read(FILES.components)).not.toMatch(/\.ds-marker|\.ds-receipts/)
  })

  test('FR-007 Ask about Brad is a link, with a floating form', () => {
    const ask = component('AskButton')
    expect(ask).toMatch(/<a\b[^>]*href=\{href\}/)
    expect(ask).toContain('Ask about Brad')
    expect(read(FILES.components)).toMatch(/\.ds-ask--floating \{\s*position: fixed;/)
  })

  // Amended by spec 038 (D229, D230): a source takes the receipts' summary's place at 44 px, and the sparkle the marker's,
  // its target 44 px square. Two parts ring more than their own box, so each takes its own outline off: the sparkle
  // rings its disc, in its own accent, and a linked stat's link rings the whole stat.
  test('FR-011 every focusable thing gets a 2-pixel accent ring, and controls are 44 pixels tall', () => {
    const css = read(FILES.components)
    expect(read(FILES.tokens)).toMatch(/--focus-ring: 2px solid var\(--color-accent\);/)
    expect(css).toMatch(/\.ds :focus-visible,\s*\.ds \.is-focus \{\s*outline: var\(--focus-ring\);/)
    for (const name of ['.ds-button', '.ds-roles__item', '.ds-source']) {
      expect(css, name).toMatch(new RegExp(`\\${name} \\{[^}]*min-height: 2\\.75rem;`))
    }
    expect(css).toMatch(/\.ds-claim-ask \{[^}]*--ask-target: 2\.75rem;[^}]*width: var\(--ask-target\);\s*height: var\(--ask-target\);/)
    const off = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^}]*outline:\s*(?:none|0)\b/g)].map((match) =>
      (match[1] ?? '').trim().replace(/\s+/g, ' '),
    )
    expect(off).toEqual(['.ds .ds-stat__link:focus-visible', '.ds .ds-claim-ask:focus-visible, .ds .ds-claim-ask.is-focus'])
    expect(css).toMatch(
      /\.ds-stat--link:has\(\.ds-stat__link:focus-visible\),\s*\.ds-stat--link\.is-focus \{\s*outline: var\(--focus-ring\);/,
    )
    expect(css).toMatch(/\.ds-claim-ask:focus-visible::before,\s*\.ds-claim-ask\.is-focus::before \{\s*outline: 2px solid var\(--ask-on\);/)
    expect(css).toMatch(/\.ds-claim-ask \{[^}]*--ask-on: var\(--color-accent\);/)
    expect(css).toMatch(/\.ds-band \.ds-claim-ask \{[^}]*--ask-on: var\(--color-band-accent\);/)
  })

  test('FR-012 every transition sits in the no-preference query, lasts at most 240 ms, and nothing loops', () => {
    // Spec 027's frame adds MA-8's 320 ms rule, MA-16's 1,100 ms underline after 350 ms, and MA-21's 200 ms drop (D209).
    // Spec 028's reveals add MA-9–MA-11, MA-13 and MA-14's once-per-load animations, MA-17's 220 ms swap and
    // 300 ms check, and MA-19's 300 ms light on cards (D211).
    // Amended by spec 038 (D229, D230): MA-12, spec 026's drawer and its row's 650 ms tint (D208), and MA-11's pop are
    // gone. MA-28 is the exception in their place: a claim a link lands on fades its tint over 1,600 ms. MA-27's
    // tooltip fades and rises in 150 ms.
    const EXCEPTIONS =
      /\bds-claim-flash 1600ms\b|\b(?:opacity|translate) 150ms\b|\btransform 320ms\b|\bds-jump 1100ms var\(--ease-out-soft\) 350ms\b|\bds-menu-drop 200ms\b|\bds-rv-[\w-]+ \d+ms[^;]*|\b(?:scale|translate) 220ms\b|\bstroke-dashoffset 300ms var\(--ease-out-soft\) 60ms\b|--rv-glow 300ms\b/g
    expect(read(FILES.components)).not.toMatch(/\bheight 280ms\b|\bcontent-visibility 280ms\b|\bds-receipts-flash\b|\bds-rv-pop\b/)
    for (const { file, text } of designSources()) {
      const { still, blocks } = withoutMotionBlocks(text.replace(EXCEPTIONS, ''))
      expect(still, file).not.toMatch(/@keyframes|\banimation(?:-name)?\s*:|\btransition(?:-property)?\s*:/)
      for (const block of blocks) {
        expect(block, file).not.toMatch(/infinite|animation-iteration-count/)
        for (const duration of block.match(/var\(--duration-[\w-]+\)|\b\d+(?:\.\d+)?m?s\b/g) ?? []) {
          expect(duration, file).toMatch(/--duration-(?:quick|base)\b/)
        }
      }
    }
    const tokens = read(FILES.tokens)
    expect(tokens).toMatch(/--duration-quick: 150ms;/)
    expect(tokens).toMatch(/--duration-base: 240ms;/)
  })

  test("FR-012 S7.1 no design-system file names Tailwind's motion utilities, in a class, a class:list or any string", () => {
    for (const { file, text } of designSources()) {
      for (const literal of text.match(/"[^"\n]*"|'[^'\n]*'|`[^`]*`/g) ?? []) {
        expect(literal, file).not.toMatch(/(?:^|[\s"'`])(?:transition(?:-[a-z]+)?|animate-[a-z]+|duration-\d+|ease-(?:in|out|linear|in-out))(?=[\s"'`])/)
      }
    }
  })

  test('FR-013 the design system ships no script, names no other host for a request, and has no inline style', () => {
    for (const { file, text } of designSources()) {
      expect(text, file).not.toMatch(/<script\b|\bclient:[a-z]+|from ['"](?:react|motion)/)
      expect(text, file).not.toMatch(/\sstyle=["{]/)
      expect(text, file).not.toMatch(/(?:src|href)=["']\/\/|@import\s+url\(|url\(\s*['"]?https?:/)
    }
  })
})

describe('v1 stays as released', () => {
  test('FR-008 S5.1 the design system has its own layout with noindex on by default, and v1 loads none of it', () => {
    const layout = read(FILES.layout)
    expect(layout).toMatch(/noindex = true/)
    expect(layout).toMatch(/\{noindex && <meta name="robots" content="noindex" \/>\}/)
    expect(layout).toContain("import '../styles/ds/tokens.css'")
    const v1 = read(FILES.v1Layout)
    expect(v1).not.toMatch(/styles\/ds\/|--font-inter-tight|--font-jetbrains-mono|components\/ds\//)
    for (const glob of ["'./ds'", "'../components/ds'", "'../layouts/DesignBase.astro'", "'../pages/design-system.astro'"]) {
      expect(read(FILES.v1Tokens), glob).toContain(`@source not ${glob};`)
    }
  })

  test('FR-009 S5.2 the gallery uses the layout, keeps noindex, and offers a Device, Light and Dark switch in CSS', () => {
    const page = read(FILES.page)
    expect(page).toMatch(/<DesignBase\b/)
    expect(page).not.toMatch(/noindex=\{false\}/)
    for (const id of ['theme-device', 'theme-light', 'theme-dark']) expect(page, id).toMatch(new RegExp(`<input type="radio" name="theme" id="${id}"`))
    const css = read(FILES.gallery)
    expect(css).toMatch(/:root:has\(#theme-light:checked\) \{\s*color-scheme: light;/)
    expect(css).toMatch(/:root:has\(#theme-dark:checked\) \{\s*color-scheme: dark;/)
  })

  test('FR-009 S5.2 no page in the source links the gallery', () => {
    const pages = sitePagesExceptGallery()
    expect(pages.length).toBeGreaterThan(2)
    for (const file of pages) expect(read(file), file).not.toContain('/design-system')
  })
})

function sitePagesExceptGallery(): string[] {
  const roots = [path.dirname(FILES.page), path.dirname(FILES.v1Layout), path.join(path.dirname(FILES.page), '..', 'components')]
  return roots
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => readdirSync(dir).map((name) => path.join(dir, name)))
    .filter((file) => /\.(?:astro|mdx?)$/.test(file) && path.basename(file) !== 'design-system.astro')
}
