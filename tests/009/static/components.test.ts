import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { componentSources, designSources, FILES, read, withoutMotionBlocks } from '../helpers/ds.ts'

// The components, the layout and the gallery, read as text (FR-003 to
// FR-009, FR-011 to FR-013, S5.1, S5.2). The browser tests check behavior.

const component = (name: string): string => read(path.join(FILES.componentsDir, `${name}.astro`))

describe('the components', () => {
  test('FR-003 FR-004 FR-005 FR-006 FR-007 each component Home v2 and the receipts need has its file', () => {
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
      'Receipts',
      'ReceiptMarker',
      'AskButton',
      'Icon',
    ]) {
      expect(names, name).toContain(`${name}.astro`)
    }
  })

  test("FR-003 the header names its regions, links Brad's profiles, and folds into a native disclosure on a phone", () => {
    const header = component('Header')
    expect(header).toMatch(/aria-label="Sections"/)
    expect(header).toMatch(/aria-label="Elsewhere"/)
    expect(header).toContain("'https://github.com/memorex386'")
    expect(header).toContain("'https://www.linkedin.com/in/brad-thome/'")
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
  test('FR-006 a card holds its receipts in one native disclosure, and a marker links into its row', () => {
    const receipts = component('Receipts')
    expect(receipts).toMatch(/<details class="ds-receipts__drawer"/)
    expect(receipts).toMatch(/<summary\b/)
    expect(receipts).toMatch(/id=\{rowIdOf\(item\.id\)\}/)
    expect(receipts).toMatch(/\{RECEIPTS\.ask\}/)
    expect(component('ReceiptMarker')).toMatch(/href=\{`#\$\{rowIdOf\(target\)\}`\}/)
  })

  test('FR-007 Ask about Brad is a link, with a floating form', () => {
    const ask = component('AskButton')
    expect(ask).toMatch(/<a\b[^>]*href=\{href\}/)
    expect(ask).toContain('Ask about Brad')
    expect(read(FILES.components)).toMatch(/\.ds-ask--floating \{\s*position: fixed;/)
  })

  test('FR-011 every focusable thing gets a 2-pixel accent ring, and controls are 44 pixels tall', () => {
    const css = read(FILES.components)
    expect(read(FILES.tokens)).toMatch(/--focus-ring: 2px solid var\(--color-accent\);/)
    expect(css).toMatch(/\.ds :focus-visible,\s*\.ds \.is-focus \{\s*outline: var\(--focus-ring\);/)
    for (const name of ['.ds-button', '.ds-roles__item', '.ds-receipts__summary']) {
      expect(css, name).toMatch(new RegExp(`\\${name} \\{[^}]*min-height: 2\\.75rem;`))
    }
    expect(css).toMatch(/\.ds-marker \{[^}]*min-width: 1\.5rem;[^}]*height: 1\.5rem;/)
    expect(css).not.toMatch(/outline:\s*(?:none|0)\b/)
  })

  test('FR-012 every transition sits in the no-preference query, lasts at most 240 ms, and nothing loops', () => {
    // Spec 026's MA-12 is the one exception: the receipts drawer opens over 280 ms and its row's tint fades over 650 ms (D208).
    // Spec 027's frame adds MA-8's 320 ms rule, MA-16's 1,100 ms underline after 350 ms, and MA-21's 200 ms drop (D209).
    // Spec 028's reveals add MA-9–MA-11, MA-13 and MA-14's once-per-load animations, MA-17's 220 ms swap and
    // 300 ms check, and MA-19's 300 ms light on cards (D211).
    const MA_12 =
      /\bheight 280ms\b|\bcontent-visibility 280ms\b|\bds-receipts-flash 650ms\b|\btransform 320ms\b|\bds-jump 1100ms var\(--ease-out-soft\) 350ms\b|\bds-menu-drop 200ms\b|\bds-rv-[\w-]+ \d+ms[^;]*|\b(?:scale|translate) 220ms\b|\bstroke-dashoffset 300ms var\(--ease-out-soft\) 60ms\b|--rv-glow 300ms\b/g
    for (const { file, text } of designSources()) {
      const { still, blocks } = withoutMotionBlocks(text.replace(MA_12, ''))
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
