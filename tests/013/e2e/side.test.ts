import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, HOME, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 013's "On the side" section in the browser: its order and framing, its
// words against the claims and project files, the closing rule, the receipts,
// the links, the keyboard, contrast and layout shift. Playwright's config asks
// for reduced motion by default.

const CONTENT = path.resolve(import.meta.dirname, '../../../apps/site/content')
interface Claim {
  subject: string
  text: string
  evidence: string[]
}
const CLAIMS = parse(readFileSync(path.join(CONTENT, 'claims.yaml'), 'utf8')) as Record<string, Claim>
const RULE = 'Never say the 1,235 PRs all went through the newer workflow.'
const SHOWN = ['vindecoded-2', 'vindecoded-3', 'vindecoded-7', 'sudoku-world-1', 'sudoku-world-2']
const SECTION = '#side'
const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()
/** A claim's text as a visitor reads it: less the rule, its list lines run together. */
const visible = (id: string): string => {
  const text = CLAIMS[id]?.text ?? ''
  return squash((id === 'vindecoded-7' ? text.trimEnd().slice(0, -RULE.length) : text).replace(/^\s*- /gm, ' '))
}

/** Each claim's text, less its marker. */
const claimTexts = (page: Page): Promise<string[]> =>
  page.evaluate(
    `[...document.querySelectorAll('#side [data-claim]')].map((c) => { const copy = c.cloneNode(true); copy.querySelector('.ds-marker')?.remove(); return [...copy.querySelectorAll('p, li')].map((e) => e.textContent).join(' ').replace(/\\s+/g, ' ').trim() })`,
  ) as Promise<string[]>

test.describe('what the section shows', () => {
  test('S1.1 FR-001 SC-002 P1 P2 on a desktop the eyebrow, heading, then the VINDecoded and Sudoku World cards read in order after Experience', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      const section = page.locator(SECTION)
      expect(
        await page.evaluate(`document.querySelector('#experience').compareDocumentPosition(document.querySelector('#side')) & 4`),
      ).toBe(4)
      const eyebrow = section.locator('.ds-eyebrow')
      await expect(eyebrow).toHaveText('On the side')
      await expect(eyebrow).toHaveCSS('text-transform', 'uppercase')
      await expect(section.getByRole('heading', { level: 2 })).toHaveText('What I build on the side')
      await expect(section.locator('article')).toHaveCount(2)
      expect(await section.locator('article').evaluateAll((cards) => cards.map((card) => card.id))).toEqual([
        'side-vindecoded',
        'side-sudoku-world',
      ])
      await expect(section.getByRole('heading', { level: 3 })).toHaveText(['VINDecoded', 'Sudoku World'])
    }
  })

  test("S1.2 S1.3 FR-002 VINDecoded's full card and Sudoku World's small card, with their kickers, stats, claims and links", async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const vd = page.locator('#side-vindecoded')
    await expect(vd).toHaveClass(/side__card--card/)
    await expect(vd.locator('.ds-card__kicker')).toHaveText('Vehicle research · since 2015')
    await expect(vd.locator('.ds-stat dd')).toHaveText(['1M+', '400K+'])
    await expect(vd.locator('.ds-stat dt')).toHaveText(['Android downloads · 4.5 stars', 'iOS downloads · 4.7 stars'])
    await expect(vd.locator('[data-claim]')).toHaveCount(3)
    await expect(vd.locator('.side__links > a')).toHaveText(['vindecoded.com', 'Read the case study'])
    expect(await vd.locator('.side__links > a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
      'https://vindecoded.com',
      '/vindecoded-agents',
    ])
    const sudoku = page.locator('#side-sudoku-world')
    await expect(sudoku).toHaveClass(/side__card--small/)
    await expect(sudoku.locator('.ds-card__kicker')).toHaveText('Game · web, Android and iOS')
    await expect(sudoku.locator('.ds-stat')).toHaveCount(0)
    await expect(sudoku.locator('[data-claim]')).toHaveCount(2)
    await expect(sudoku.locator('.side__links > a')).toHaveText(['sudokuworld.app'])
    await expect(sudoku.locator('.side__links > a')).toHaveAttribute('href', 'https://sudokuworld.app')
    // The small card's name is smaller than the full card's.
    const size = async (card: string): Promise<number> =>
      parseFloat(await page.locator(`${card} h3`).evaluate((h) => h.ownerDocument.defaultView?.getComputedStyle(h).fontSize ?? '0'))
    expect(await size('#side-sudoku-world')).toBeLessThan(await size('#side-vindecoded'))
  })

  test('S1.4 FR-004 neither project is the headline, and nothing on the home calls Brad one engineer or a team of AI agents', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const headlines = await page.locator('h1, h2, .ds-eyebrow').allTextContents()
    for (const text of headlines) expect(text).not.toMatch(/VINDecoded|Sudoku World/)
    await expect(page.locator('main article:has(h3:text-is("VINDecoded"))')).toHaveCount(1)
    await expect(page.locator('#side article:has(h3:text-is("VINDecoded"))')).toHaveCount(1)
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).not.toMatch(/one engineer|one person|team of AI agents/i)
  })

  test('S1.5 P3 P4 on a phone, and at 320, the parts stack in the same order, the stats under the name, and nothing scrolls sideways', async ({
    page,
  }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'dark' })
      await openHome(page)
      expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width}`).toBe(
        true,
      )
      const tops = await page
        .locator('#side h2, #side h3, #side .ds-stats, #side [data-claim], #side .side__links')
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top))
      expect(tops).toEqual([...tops].sort((a, b) => a - b))
      const name = await page.locator('#side-vindecoded .side__card-head').boundingBox()
      const stats = await page.locator('#side-vindecoded .ds-stats').boundingBox()
      expect(stats?.y ?? 0).toBeGreaterThanOrEqual((name?.y ?? 0) + (name?.height ?? 0))
    }
  })

  test('S1.6 SC-005 FR-008 the section has no motion of its own, no script but the previews script, no inline style, and the page shifts nothing as it loads', async ({
    page,
  }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await page.goto('about:blank')
      await enter(page, { viewport, theme: 'light' }, 'no-preference')
      await page.addInitScript(
        `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
      )
      await page.goto(`${HOME}#side`)
      await page.waitForTimeout(3000)
      expect(await page.evaluate('window.__shift'), `${viewport.width}`).toBe(0)
      expect(await page.evaluate(`document.getAnimations().filter((a) => a.effect.target.closest('#side')).length`)).toBe(0)
      expect(await onlyPreviewScript(page)).toBe(true)
      expect(await page.locator('#side [style]').count()).toBe(0)
    }
  })
})

test.describe('the words', () => {
  test('S2.1 S2.3 SC-001 FR-003 every claim is a public claim as written, and no left-off claim or other subject shows', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    expect(await claimTexts(page)).toEqual(SHOWN.map(visible))
    expect(await page.locator('#side [data-claim]').evaluateAll((items) => items.map((item) => item.getAttribute('data-claim')))).toEqual(
      SHOWN,
    )
    const paragraphs = (await page.evaluate(
      `[...document.querySelectorAll('#side p')].filter((p) => !p.closest('.ds-receipt') && !p.closest('[data-claim]') && !p.matches('.ds-eyebrow, .side__links')).length`,
    )) as number
    expect(paragraphs).toBe(0)
    const body = squash((await page.locator(SECTION).textContent()) ?? '')
    for (const [id, claim] of Object.entries(CLAIMS)) {
      if (SHOWN.includes(id)) continue
      expect(body, id).not.toContain(squash(claim.text.split('\n')[0] ?? ''))
    }
  })

  test('S2.2 FR-005 the counts show after their dated lead, as a list, and the closing rule never shows', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const claim = page.locator('#side [data-claim="vindecoded-7"]')
    await expect(claim.locator('p')).toHaveText("The case study's counts, measured on 10/28:")
    await expect(claim.locator('li')).toHaveText([
      '1,235 merged PRs from June 13 to Oct 28, 2026, 83% of them from agent branches',
      '1,530 test files',
      '113 runbooks',
      /^46 ADRs/,
    ])
    await expect(claim.locator('li').last().locator('.ds-marker')).toHaveText('21')
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).not.toContain('Never say')
    expect(body).not.toContain('newer workflow')
    expect(body).not.toMatch(/all 1,235/)
  })
})

test.describe('the receipts', () => {
  test('S3.1 SC-003 FR-006 five markers, 19 to 23, each with its note, numbered once on the page', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await expect(page.locator('#side a.ds-marker')).toHaveText(['19', '20', '21', '22', '23'])
    await expect(page.locator('#side details.ds-receipt')).toHaveCount(5)
    const all = await page.locator('main a.ds-marker').allTextContents()
    expect(new Set(all).size).toBe(all.length)
  })

  test('S3.2 R1 FR-007 the proof receipts link their public pages', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    for (const [n, id] of [
      [19, 'vindecoded-2'],
      [20, 'vindecoded-3'],
      [21, 'vindecoded-7'],
      [22, 'sudoku-world-1'],
    ] as const) {
      const marker = page.getByRole('link', { name: `Receipt ${n}, proof` })
      await expect(marker).not.toHaveClass(/ds-marker--ask/)
      await marker.click()
      const receipt = page.locator(`#receipt-${id}`)
      await expect(receipt).toHaveAttribute('open', '')
      await expect(receipt.locator('.ds-receipt__kind')).toHaveText('Proof')
      const links = receipt.locator('.ds-receipt__body > a')
      const evidence = CLAIMS[id]?.evidence ?? []
      await expect(links).toHaveText(evidence.length > 1 ? evidence.map((_, i) => `See the source ${i + 1}`) : ['See the source'])
      expect(await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))).toEqual(evidence)
    }
  })

  test('S3.3 R2 the claim with no link is ask-me, pointing to Brad', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'dark' })
    await openHome(page)
    const marker = page.getByRole('link', { name: 'Receipt 23, ask Brad' })
    await expect(marker).toHaveClass(/ds-marker--ask/)
    const note = page.locator((await marker.getAttribute('href')) ?? '')
    await expect(note.locator('p')).toHaveText('No public link yet.')
    await expect(note.locator('a')).toHaveText('Ask Brad about it')
    // Spec 017 (D153): the ask-me link goes to the contact section.
    await expect(note.locator('a')).toHaveAttribute('href', '#contact')
    await expect(page.locator('#receipt-sudoku-world-2 .ds-receipt__kind')).toHaveText('Ask me')
  })

  test('S3.4 P1 P3 on a desktop each note sits in the margin beside its claim, and on a phone under it', async ({ page }) => {
    for (const [viewport, beside] of [
      [DESKTOP, true],
      [PHONE, false],
    ] as const) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const boxes = (await page.evaluate(
        `[...document.querySelectorAll('#side .ds-claim')].map((c) => { const t = c.querySelector('[data-claim]').getBoundingClientRect(); const n = c.querySelector('.ds-receipt').getBoundingClientRect(); return { tr: t.right, tt: t.top, tb: t.bottom, nl: n.left, nt: n.top } })`,
      )) as { tr: number; tt: number; tb: number; nl: number; nt: number }[]
      expect(boxes).toHaveLength(5)
      for (const box of boxes) {
        if (beside) {
          expect(box.nl).toBeGreaterThan(box.tr)
          expect(Math.abs(box.nt - box.tt)).toBeLessThan(2)
        } else expect(box.nt).toBeGreaterThanOrEqual(box.tb)
      }
    }
  })

  test('S3.5 a note opens by its marker, a click on its summary, Enter or Space, and closes again', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'dark' })
      await openHome(page)
      const receipt = page.locator('#receipt-sudoku-world-2')
      await page.getByRole('link', { name: 'Receipt 23, ask Brad' }).click()
      await expect(receipt).toHaveAttribute('open', '')
      await expect(receipt.getByRole('link', { name: 'Ask Brad about it' })).toBeInViewport()
      const summary = receipt.locator('summary')
      await summary.click()
      await expect(receipt).not.toHaveAttribute('open')
      await summary.focus()
      await page.keyboard.press('Enter')
      await expect(receipt).toHaveAttribute('open', '')
      await page.keyboard.press('Space')
      await expect(receipt).not.toHaveAttribute('open')
    }
  })

  test('S3.6 every link in the section is https, the contact section (spec 017, D153), or the case study, which the build holds', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const hrefs = await page.locator('#side a').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
    for (const href of hrefs) expect(href).toMatch(/^(https:\/\/|#contact$|\/vindecoded-agents$|#receipt-)/)
    const response = await page.request.get('/vindecoded-agents')
    expect(response.status()).toBe(200)
  })
})

test.describe('the keyboard and contrast', () => {
  test('S4.1 FR-009 F1 F2 Tab goes marker and note claim by claim, then the links, each with a 2-pixel accent ring at 3:1', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.locator('#receipt-bottle-rocket-2 summary').focus()
      const claim = (n: number, kind: string) => [
        { tag: 'a', label: `Receipt ${n}, ${kind}` },
        { tag: 'summary', label: `Receipt ${n}:` },
      ]
      const expected = [
        ...claim(19, 'proof'),
        ...claim(20, 'proof'),
        ...claim(21, 'proof'),
        { tag: 'a', label: 'vindecoded.com' },
        { tag: 'a', label: 'Read the case study' },
        ...claim(22, 'proof'),
        ...claim(23, 'ask Brad'),
        { tag: 'a', label: 'sudokuworld.app' },
      ]
      for (const step of expected) {
        await page.keyboard.press('Tab')
        const now = await focused(page)
        expect(now?.tag, `${theme} ${step.label}`).toBe(step.tag)
        expect(now?.label, theme).toContain(step.label)
        expect(now?.outline).toBe('solid')
        expect(now?.width ?? 0).toBeGreaterThanOrEqual(2)
        expect(now?.color).toBe(RGB[theme].accent)
        expect(contrast(now?.color ?? '', RGB[theme].bg)).toBeGreaterThanOrEqual(3)
        expect(contrast(now?.color ?? '', RGB[theme].surface)).toBeGreaterThanOrEqual(3)
      }
      await page.getByRole('link', { name: 'Receipt 20, proof' }).click()
      await page.locator('#receipt-vindecoded-3 summary').focus()
      await page.keyboard.press('Tab')
      expect((await focused(page))?.label).toBe('See the source 1')
      await page.keyboard.press('Tab')
      expect((await focused(page))?.label).toBe('See the source 2')
    }
  })

  test("S4.2 FR-001 the header's On the side link reaches the section, its heading in view", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const link = page.locator('.ds-header__nav').first().getByRole('link', { name: 'On the side' })
    await expect(link).toHaveAttribute('href', '#side')
    await link.click()
    await expect(page).toHaveURL(/#side$/)
    await expect(page.locator('#side-heading')).toBeInViewport()
  })

  test('S4.4 FR-009 every text in the section meets 4.5:1, on the cards, stats, badge and open notes, in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.evaluate(`document.querySelectorAll('#side details').forEach((d) => { d.open = true })`)
      const pairs = (await page.evaluate(String.raw`(() => {
        const bg = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const sel = '#side .ds-eyebrow, #side h2, #side h3, #side .ds-card__kicker, #side [data-claim] p, #side [data-claim] li, #side .ds-stat dt, #side .ds-stat dd, #side .side__badge:not(.side__badge--grid), #side .side__links > a, #side .ds-receipt__title, #side .ds-receipt__kind, #side .ds-receipt__body p, #side .ds-receipt__body > a'
        return [...document.querySelectorAll(sel)].map((el) => [getComputedStyle(el).color, bg(el), el.className || el.tagName])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(30)
      for (const [color, bg, what] of pairs) expect(contrast(color, bg), `${theme} ${what}: ${color} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
