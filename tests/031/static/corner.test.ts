import { describe, expect, test } from 'vitest'
import { read, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 031's static checks: the hero's button as it was and a corner button
// that never moves, one click listener for both, the corner script's two
// observers, its one passive scroll listener and its timings, the corner only
// on a phone, and the shrinking and entrance only inside the no-preference
// block (D214).

const code = (file: string): string => read(file).replace(/^\s*\/\/.*$/gm, '')
const ASK = sitePath('src', 'components', 'chat', 'Ask.astro')
const CLIENT = sitePath('src', 'components', 'chat', 'ask.client.ts')
const CORNER = sitePath('src', 'components', 'chat', 'corner.client.ts')
const MODULE = sitePath('src', 'components', 'previews', 'PreviewLink.astro')
const CSS = sitePath('src', 'styles', 'chat.css')

/** Each `@media (…)` block with this query, as its whole text. */
function blocks(css: string, query: string): string[] {
  const found: string[] = []
  // Every character a pattern reads specially is escaped, the backslash too (code-scanning alert 9).
  const open = new RegExp(`@media\\s*\\(${query.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}\\)\\s*\\{`, 'g')
  for (let match = open.exec(css); match !== null; match = open.exec(css)) {
    let depth = 1
    let at = match.index + match[0].length
    while (at < css.length && depth > 0) {
      if (css[at] === '{') depth += 1
      else if (css[at] === '}') depth -= 1
      at += 1
    }
    found.push(css.slice(match.index, at))
  }
  return found
}

describe('two buttons, one shown at a time (FR-001)', () => {
  test('S1.2 S2.3 FR-001 FR-004 Ask.astro keeps the hero’s button and adds a corner button with the same words as its name', () => {
    const ask = read(ASK)
    // The hero's keeps data-chat-open, which other specs' tests find it by; the corner's is found by its class.
    expect(ask.match(/data-chat-open/g)).toHaveLength(1)
    expect(ask).toMatch(
      /<button[^>]*class="[^"]*ds-ask--floating chat-ask"[^>]*data-chat-open[^>]*>\s*<Icon name="sparkle" \/>\s*\{TITLE\}\s*<\/button>/,
    )
    expect(ask).toMatch(
      /<button[^>]*class="[^"]*chat-corner"[^>]*aria-haspopup="dialog"[^>]*>\s*<Icon name="sparkle" \/>\s*<span class="chat-corner__label">\{TITLE\}<\/span>/,
    )
    // The name is its words: no aria-label that could drift from them.
    expect(ask).not.toMatch(/data-chat-open[^>]*aria-label/)
  })

  // Amended by spec 038 (D230): "Ask me" is retired; each claim's sparkle carries data-chat-ask now, and the same
  // listener opens the chat from it.
  test('S1.5 one delegated click listener opens the chat from either button, as from a claim’s sparkle', () => {
    const client = code(CLIENT)
    expect(client).toContain("closest?.<HTMLElement>('[data-chat-ask],[data-chat-open],.chat-corner')")
    expect(client).not.toMatch(/button\.addEventListener\('click'/)
    expect(read(sitePath('src', 'components', 'ds', 'ClaimAsk.astro'))).toMatch(/data-chat-ask=\{questionOf\(text\)\}/)
  })

  test('S1.1 S1.3 S1.4 FR-001 FR-002 the corner script joins the one module, with two observers on the hero’s button and the contact section', () => {
    expect(read(MODULE)).toContain("import '../chat/corner.client.ts'")
    const corner = code(CORNER)
    expect(corner.match(/new IntersectionObserver/g)).toHaveLength(2)
    expect(corner).toContain("querySelector('.hero .chat-ask')")
    expect(corner).toContain("getElementById('contact')")
    // Spec 032 widens the hero's band to 100 px inside the screen, and flies between the two (D215).
    expect(corner).toContain("rootMargin: '-172px 0px -100px', threshold: 1")
    expect(corner).toContain("rootMargin: '0px 0px -150px'")
  })

  test('S2.1 S2.2 S3.4 FR-003 FR-006 one passive scroll listener, a 2 px threshold and a 600 ms stop; the first entrance at 1.8 s, or at once away from the top', () => {
    const corner = code(CORNER)
    expect(corner.match(/addEventListener\(/g)).toHaveLength(1)
    expect(corner).toMatch(/addEventListener\(\s*'scroll'[\s\S]*\{ passive: true \}/)
    expect(corner).toContain('Math.abs(y - last) > 2')
    expect(corner).toMatch(/setTimeout\(\(\) => corner\.removeAttribute\('data-small'\), 600\)/)
    // It shows only once ready: at 1.8 s, or at once on a page loaded away from the top.
    expect(corner).toContain('let ready = scrollY > 0 || location.hash.length > 1')
    expect(corner).toContain('if (ready) fly(!off)')
    expect(corner).toMatch(
      /if \(!ready\)\s*setTimeout\(\(\) => \{\s*ready = true[\s\S]*corner\.toggleAttribute\('data-float', off\)\s*\}, 1800\)/,
    )
    expect(corner).not.toContain('data-entered')
    // It reads nothing but scrollY on scroll: no layout reads. (Spec 032's flight reads the boxes in its frame loop, not on scroll.)
    const scroll = corner.slice(corner.indexOf("'scroll'"), corner.indexOf('{ passive: true }'))
    expect(scroll).not.toMatch(/getBoundingClientRect\(|offsetTop|offsetHeight/)
  })
})

describe('the CSS (S5.1, S3.3)', () => {
  const css = read(CSS)
  const phone = blocks(css, 'max-width: 40rem').join('')

  test('S5.1 FR-006 the corner is hidden on a desktop and with no script, and shows only on a phone while it floats', () => {
    expect(blocks(css, 'min-width: 40.0625rem').join('')).toMatch(/\.chat-corner\s*\{[^}]*display: none/)
    expect(blocks(css, 'scripting: none').join('')).toMatch(/\.chat-corner\s*\{[^}]*display: none/)
    expect(css).toMatch(/\n\.chat-corner\s*\{[^}]*visibility: hidden/)
    expect(phone).toMatch(/\.chat-corner\[data-float\]:not\(\[data-end\]\)\s*\{[^}]*visibility: visible/)
    // While it shows, the hero's button is hidden, so only one is ever seen or heard.
    expect(phone).toMatch(/\.hero:has\(\.chat-corner\[data-float\]\) \.chat-ask\s*\{[^}]*visibility: hidden/)
  })

  test('S1.1 S2.3 FR-004 the corner is fixed, 56 px tall and above the home bar', () => {
    expect(css).toMatch(
      /\n\.chat-corner\s*\{[^}]*position: fixed;[^}]*bottom: calc\(1\.25rem \+ env\(safe-area-inset-bottom\)\);[^}]*min-height: 3\.5rem/,
    )
  })

  test('S4.1 FR-005 while it shows, the page keeps focus clear of it with bottom scroll padding', () => {
    expect(phone).toMatch(
      /:root:has\(\.chat-corner\[data-float\]:not\(\[data-end\]\)\)\s*\{[^}]*scroll-padding-bottom: calc\(5\.5rem \+ env\(safe-area-inset-bottom\)\)/,
    )
  })

  test('S2.1 S3.1 S3.2 S3.3 S5.3 FR-003 the circle is a clip and a transform, and it and every entrance exist only with motion allowed', () => {
    const { still, blocks: motion } = withoutMotionBlocks(css)
    expect(still).not.toMatch(/data-small/)
    for (const rule of still.match(/\.chat-corner[^{}]*\{[^}]*\}/g) ?? [])
      expect(rule).not.toMatch(/clip-path|transform|transition|animation|opacity/)
    const moving = motion.join('')
    expect(moving).toMatch(
      /\.chat-corner\[data-small\]:not\(\[data-fly\]\)\s*\{\s*clip-path: circle\(1\.75rem at 1\.75rem 50%\);\s*transform: translateX\(calc\(100% - 3\.5rem\)\);/,
    )
    // MA-20 plays with no delay, so nothing can cut it short; since spec 032, only before the first flight (D215).
    expect(moving).toMatch(/\.chat-corner\[data-float\]:not\(\[data-flown\]\)\s*\{[^}]*chat-ask-rise 420ms/)
    expect(moving).not.toMatch(/\.chat-corner[^{]*\{[^}]*animation-delay/)
    // Nothing in the corner's motion changes its box: no width, padding or gap.
    const corner = moving.slice(moving.indexOf('.chat-corner {'))
    expect(corner).not.toMatch(/(?:^|\s)(?:width|max-width|padding[\w-]*|gap):/m)
  })
})
