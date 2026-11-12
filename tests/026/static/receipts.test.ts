import { createHash } from 'node:crypto'
import { existsSync, readdirSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { read, repoPath, sitePath, withoutMotionBlocks } from '../../009/helpers/ds.ts'

// Spec 026's static checks: each card renders one drawer, the per-claim
// notes are gone, a marker links its row, MA-12 sits in CSS inside the
// no-preference block, and nothing adds script (D208).

const home = (name: string): string => read(sitePath('src', 'components', 'home', name))
const ds = (name: string): string => sitePath('src', 'components', 'ds', name)
const css = read(sitePath('src', 'styles', 'ds', 'components.css'))
const { still, blocks } = withoutMotionBlocks(css)
const motion = blocks.join('\n')

describe('one drawer per card (T3)', () => {
  test('S1.1 FR-001 Hopper renders a drawer for its role lines, one per topic with its tags, and one for any quotes', () => {
    const source = home('Hopper.astro')
    // Spec 030 adds each card's place, for the drawer's ask question (D213).
    expect(source).toMatch(/<Receipts items=\{story\.role\} place=\"Hopper\" \/>/)
    expect(source).toMatch(/<Receipts items=\{topic\.items\} place=\"Hopper\">\s*\{topic\.tags\.length > 0 && <Chips slot="tags"/)
    expect(source).toMatch(/<Receipts items=\{story\.quotes\} place=\"Hopper\" \/>/)
  })

  test('S1.1 FR-001 Experience renders one drawer on the featured card and one on each card, with its tags', () => {
    const source = home('Experience.astro')
    expect(source.match(/<Receipts items=\{items\}/g)).toHaveLength(2)
    expect(source).toMatch(/<Receipts items=\{items\} place=\{job\.company\}>\s*\{look\.tags && \(?\s*<Chips slot="tags"/)
  })

  test('S1.1 FR-001 each side project renders one drawer', () => {
    expect(home('Side.astro').match(/<Receipts items=\{items\} place=\{project\.name\} \/>/g)).toHaveLength(1)
  })

  test('S1.1 FR-001 no per-claim note is left: Claim and Receipt are gone, and the claims hold only their markers', () => {
    expect(existsSync(ds('Claim.astro'))).toBe(false)
    expect(existsSync(ds('Receipt.astro'))).toBe(false)
    for (const name of ['HopperClaim.astro', 'SideClaim.astro']) {
      expect(home(name), name).not.toMatch(/Receipt\b|<details/)
      expect(home(name), name).toMatch(/<ReceiptMarker /)
    }
    expect(css).not.toMatch(/\.ds-receipt\b|\.ds-receipt__|\.ds-claim\b|\.ds-claim__/)
  })

  test('S1.2 FR-002 the drawer is a native details, closed unless asked, with numbered rows of title and host or "Ask me"', () => {
    const source = read(ds('Receipts.astro'))
    expect(source).toMatch(/<details class="ds-receipts__drawer" open=\{open\}>/)
    expect(source).toMatch(/<li[^>]*id=\{rowIdOf\(item\.id\)\} value=\{item\.n\}>/)
    expect(source).toMatch(/\{hostOf\(href\)\}/)
    expect(source).toMatch(/\{RECEIPTS\.ask\}/)
    expect(source).toMatch(/<PreviewLink /)
  })

  test('S1.8 the claims keep a measure of at most 56 rem', () => {
    expect(still).toMatch(/\.ds-claims \{[^}]*max-width: 56rem;/)
  })
})

describe('a marker opens its drawer (S2)', () => {
  test('S2.1 FR-003 a marker links its row, and the row tints as the target', () => {
    expect(read(ds('ReceiptMarker.astro'))).toMatch(/href=\{`#\$\{rowIdOf\(target\)\}`\}/)
    expect(still).toMatch(/\.ds-receipts__row:target \{\s*background: var\(--receipts-flash\);/)
  })

  test('S2.2 S2.4 FR-004 MA-12 runs only inside the no-preference block, at its timings', () => {
    expect(motion).toMatch(/\.ds-receipts__chevron \{\s*transition: rotate var\(--duration-base\)/)
    expect(motion).toMatch(/\.ds-receipts__row:target \{[^}]*animation: ds-receipts-flash 650ms/)
    expect(motion).toMatch(/@supports \(interpolate-size: allow-keywords\)/)
    expect(motion).toMatch(/::details-content \{[^}]*height 280ms/)
    expect(still).not.toMatch(/\.ds-receipts[^{]*\{[^}]*(transition|animation)\s*:/)
  })
})

describe('no script (S2.5, S4.6)', () => {
  test('S4.6 SC-005 FR-008 the Content-Security-Policy is the one at 5f5ffbc, before this slice', () => {
    const hosting = JSON.parse(read(repoPath('firebase.json'))) as { hosting: { headers: { headers: { key: string; value: string }[] }[] } }
    const csp = hosting.hosting.headers.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy')
    expect(csp).toBeDefined()
    expect(
      createHash('sha256')
        .update(csp?.value ?? '')
        .digest('hex'),
      // Amended by spec 037: /evals' new styles change its inlined stylesheet's hash, which pnpm csp wrote.
    ).toBe('19d369dd8dbd732d086d6e688602cf5e2f63f05a4ada1b1e2e74bdf4cb578716')
  })

  test('S2.5 S4.6 FR-008 the drawer and markers ship no script, and no client file was added for them', () => {
    for (const name of ['Receipts.astro', 'ReceiptMarker.astro']) expect(read(ds(name)), name).not.toMatch(/<script/)
    const clients = readdirSync(sitePath('src', 'components'), { recursive: true })
      .map(String)
      .filter((file) => file.endsWith('.client.ts'))
    expect(clients.filter((file) => /receipt/i.test(file))).toEqual([])
  })
})
