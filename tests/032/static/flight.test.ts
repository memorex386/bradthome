import { describe, expect, test } from 'vitest'
import { read, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 032's static checks: the band, the frame loop and its translate, the
// reduced-motion swap, the first frame drawn at once, the hero's phone pill,
// and the flight's states only with motion allowed (D215).

const code = (file: string): string => read(file).replace(/^\s*\/\/.*$/gm, '')
const CORNER = code(sitePath('src', 'components', 'chat', 'corner.client.ts'))
const CSS = read(sitePath('src', 'styles', 'chat.css'))

describe('the flight (story 1)', () => {
  test('S1.2 S1.3 FR-001 the place counts as in view once all of it is 100 px inside the screen, below the header', () => {
    expect(CORNER).toContain("{ rootMargin: '-172px 0px -100px', threshold: 1 }")
    expect(CORNER).toContain('off = (entry?.intersectionRatio ?? 0) < 1')
  })

  test('S1.4 S1.5 S1.6 FR-001 each frame moves toward its goal over 320 ms and aims a translate at the place where it is now', () => {
    expect(CORNER).toContain('(now - (then || now)) / 320')
    expect(CORNER).toContain('const h = hero.getBoundingClientRect()')
    expect(CORNER).toContain('corner.style.transform = `translate(${(h.left - base.left) * e}px,${(h.top - base.top) * e}px)`')
    expect(CORNER).toContain('requestAnimationFrame(tick)')
    // The first frame is drawn at once, so no frame shows the corner before a flight out leaves the place.
    expect(CORNER).toContain('tick(then)')
  })

  test('S2.1 FR-003 with reduced motion the script swaps the two at once', () => {
    // The corner's transitions exist only on a phone with motion allowed, so none means a swap; no matchMedia (spec 003's lock).
    expect(CORNER).toMatch(
      /if \(getComputedStyle\(corner\)\.transitionDuration === '0s'\) \{\s*p = goal\s*corner\.toggleAttribute\('data-float', !into\)\s*return/,
    )
    expect(CORNER).not.toContain('matchMedia')
  })
})

describe('the CSS (S1.1, S2.2, S2.3)', () => {
  test('S1.1 FR-002 on a phone the hero’s button is the corner’s pill: its width, 56 px, the same padding and shadow', () => {
    const rule = CSS.match(/\n {2}\.hero \.chat-ask \{[^}]*\}/)?.[0] ?? ''
    expect(rule).toContain('align-self: flex-start;')
    expect(rule).toContain('min-height: 3.5rem;')
    expect(rule).toContain('padding-inline: 1.125rem 1.375rem;')
    expect(rule).toContain('box-shadow: var(--shadow-raised);')
    expect(CSS).toMatch(
      /\n\.chat-corner \{[^}]*min-height: 3\.5rem;[^}]*padding-inline: 1\.125rem 1\.375rem;[^}]*box-shadow: var\(--shadow-raised\);/,
    )
  })

  test('S2.2 S2.3 in flight the script owns the transform and the shrink pauses; MA-20 plays only before the first flight', () => {
    const { still, blocks } = withoutMotionBlocks(CSS)
    expect(still).not.toContain('data-fly')
    const motion = blocks.join('')
    expect(motion).toMatch(/\.chat-corner\[data-fly\] \{\s*transition: clip-path 300ms var\(--ease-out-soft\);\s*\}/)
    expect(motion).toMatch(/\.chat-corner\[data-small\]:not\(\[data-fly\]\) \{\s*clip-path/)
    expect(motion).toMatch(/\.chat-corner\[data-float\]:not\(\[data-flown\]\) \{\s*animation:/)
  })
})
