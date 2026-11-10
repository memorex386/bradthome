import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { read, repoPath, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 027's static checks: the sticky header only on the home and role
// pages, its state from IntersectionObservers with no scroll handler, every
// motion inside the no-preference block, the scroll-driven keyframes as
// longhands, and the footer's line (D209, D210).

const ds = (name: string): string => read(sitePath('src', 'components', 'ds', name))
const page = (name: string): string => read(sitePath('src', 'pages', name))
const homePage = read(sitePath('src', 'components', 'home', 'HomePage.astro'))
const script = ds('header.client.ts')
const css = read(sitePath('src', 'styles', 'ds', 'components.css'))
const previews = read(sitePath('src', 'styles', 'previews.css'))
const { still, blocks } = withoutMotionBlocks(css)
const motion = blocks.join('\n')
const previewMotion = withoutMotionBlocks(previews)

describe('the sticky header (T4)', () => {
  test('S1.1 FR-001 the header takes a sticky prop that adds its class, data-sticky, the 8 px mark and the rule', () => {
    const header = ds('Header.astro')
    expect(header).toMatch(/sticky\?: boolean/)
    expect(header).toMatch(/'ds-header--sticky'/)
    expect(header).toMatch(/data-sticky=\{sticky \? '' : undefined\}/)
    expect(header).toMatch(/\{sticky && <span class="ds-header-mark" aria-hidden="true" \/>\}/)
    expect(header).toMatch(/\{sticky && <span class="ds-header__rule" aria-hidden="true" \/>\}/)
  })

  test('S1.1 FR-001 only the home and role pages pass sticky; the gallery, evals and privacy pages keep theirs', () => {
    expect(homePage).toMatch(/<Header sections=\{sections\} sticky \/>/)
    for (const name of ['design-system.astro', 'evals.astro', 'privacy.astro']) expect(page(name), name).not.toMatch(/<Header[^>]*sticky/)
  })

  test('S1.2 S1.4 FR-007 the header stays at the top on its own box; the bar shortens by scale and the row moves by translate', () => {
    expect(still).toMatch(/\.ds-header--sticky \{[^}]*position: sticky;[^}]*top: 0;/)
    expect(still).toMatch(/\.ds-header--sticky \.ds-header__in \{[^}]*min-height: 4\.5rem;/)
    expect(still).toMatch(/\.ds-header--sticky\[data-stuck\]::before \{\s*opacity: 1;\s*scale: 1 0\.8333;/)
    expect(still).toMatch(/\.ds-header--sticky\[data-stuck\] \.ds-header__in \{\s*translate: 0 -0\.375rem;/)
  })

  test('S1.6 FR-002 with no script the bar is always on', () => {
    expect(still).toMatch(/@media \(scripting: none\) \{\s*\.ds-header--sticky::before \{\s*opacity: 1;/)
  })

  test('S8.6 FR-003 in-page sections land below the header', () => {
    expect(still).toMatch(/main > section\[id\] \{\s*scroll-margin-top: 3\.75rem;/)
  })
})

describe('the script (FR-002, S8.4)', () => {
  test('S8.4 FR-002 header.client.ts uses IntersectionObservers and never listens for scroll', () => {
    expect(script.match(/new IntersectionObserver\(/g)).toHaveLength(3)
    expect(script).toMatch(/rootMargin: '0px 0px -60% 0px'/)
    expect(script).toMatch(/getBoundingClientRect\(\)\.top <= innerHeight \* 0\.4/)
    expect(script).toMatch(/rootMargin: '-3% 0px -96% 0px'/)
    expect(script).not.toMatch(/['"]scroll['"]|onscroll|requestAnimationFrame/)
    expect(script).toMatch(/'aria-current', 'location'/)
  })

  test('S8.5 FR-008 it joins the one module beside the others', () => {
    expect(read(sitePath('src', 'components', 'previews', 'PreviewLink.astro'))).toMatch(/import '\.\.\/ds\/header\.client\.ts'/)
  })

  test('S8.5 FR-008 the Content-Security-Policy is the one before this slice', () => {
    const hosting = JSON.parse(read(repoPath('firebase.json'))) as { hosting: { headers: { headers: { key: string; value: string }[] }[] } }
    const csp = hosting.hosting.headers.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy')
    expect(
      createHash('sha256')
        .update(csp?.value ?? '')
        .digest('hex'),
    ).toBe('ebcdc92d5e13ee0a0a4cb9962515d7b529d370b8161eb4dd54c1e995d3bace37')
  })
})

describe('motion only when allowed (FR-007)', () => {
  test('S1.3 S2.2 MA-6 MA-7 the header changes over 240 ms only inside no-preference, and the name scales only there', () => {
    expect(motion).toMatch(/\.ds-header--sticky::before \{\s*transition:\s*opacity var\(--duration-base\)/)
    expect(motion).toMatch(/\.ds-header--sticky\[data-stuck\] \.ds-header__name \{\s*scale: 0\.94;/)
    expect(still).not.toMatch(/\.ds-header__name \{[^}]*scale:/)
    expect(still).not.toMatch(/\.ds-header(--sticky|__in|__rule|__name)[^{]*\{[^}]*(transition|animation)[\w-]*\s*:/)
  })

  test('S1.3 MA-6 the scroll drives the header over 0–64 px, written as longhands so the build keeps the timeline', () => {
    expect(motion).toMatch(/@supports \(animation-timeline: scroll\(\)\)/)
    for (const name of ['ds-header-bar', 'ds-header-row', 'ds-header-name']) {
      expect(motion).toMatch(
        new RegExp(`animation-name: ${name};[^}]*animation-timeline: scroll\\(root\\);[^}]*animation-range: 0px 64px;`),
      )
    }
    expect(motion).not.toMatch(/animation: ds-header-/)
  })

  test('S3.2 MA-8 the rule slides in 320 ms only inside no-preference', () => {
    expect(motion).toMatch(/\.ds-header__rule \{\s*transition:\s*transform 320ms/)
    expect(still).toMatch(/\.ds-header__rule \{[^}]*height: 2px;[^}]*transform: translateX\(var\(--x, 0\)\) scaleX\(var\(--w, 0\)\);/)
  })

  test('S4.1 S4.2 MA-16 smooth scrolling and the heading underline sit only inside no-preference', () => {
    expect(motion).toMatch(/html:has\(\.ds-header--sticky\) \{\s*scroll-behavior: smooth;/)
    expect(motion).toMatch(/animation: ds-jump 1100ms var\(--ease-out-soft\) 350ms 1 both;/)
    expect(still).not.toMatch(/scroll-behavior|ds-jump/)
  })

  test('S5.2 MA-21 the phone menu drops in 200 ms only inside no-preference', () => {
    expect(motion).toMatch(/\.ds-header__menu\[open\] \.ds-header__menu-panel \{\s*animation: ds-menu-drop 200ms/)
    expect(still).not.toMatch(/ds-menu-drop/)
  })

  test('S5.1 S5.3 MA-18 previews open in 200 ms and close in 120 ms from @starting-style, held-open cards excluded, only inside no-preference', () => {
    const allowed = previewMotion.blocks.join('\n')
    expect(allowed).toMatch(
      /\.lp-card:not\(\.lp-card--still\) \{[^}]*opacity: 0;[^}]*scale: 0\.96;[^}]*translate: 0 4px;[^}]*opacity 120ms/,
    )
    expect(allowed).toMatch(/:popover-open \{[^}]*transition-duration: 200ms;/)
    expect(allowed).toMatch(/@starting-style \{/)
    expect(previewMotion.still).not.toMatch(/transition|@starting-style/)
  })
})

describe('the role switch and footer (T5, T6)', () => {
  test('S6.1 FR-005 on a phone the quiet switch never wraps and scrolls sideways', () => {
    expect(still).toMatch(/@media \(max-width: 40rem\) \{\s*\.ds-roles--quiet \{\s*flex-wrap: nowrap;\s*overflow-x: auto;/)
  })

  test('S7.1 FR-006 the home and role pages’ footer carries the line and links the public repo; other pages keep their notes', () => {
    expect(homePage).toMatch(/<Footer built \/>/)
    expect(homePage).not.toMatch(/The redesign, in progress\./)
    const footer = ds('Footer.astro')
    expect(footer).toMatch(
      /Built in the open:\{' '\}\s*<a class="ds-footer__repo" href="https:\/\/github\.com\/memorex386\/bradthome">\s*specs, tests and decisions on GitHub\s*<\/a>/,
    )
    expect(page('evals.astro')).toMatch(/<Footer>Tested on the real model\.<\/Footer>/)
    expect(page('privacy.astro')).toMatch(/<Footer>No cookies\.<\/Footer>/)
  })
})
