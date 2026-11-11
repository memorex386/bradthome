import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, HOME, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 012's Experience section in the browser: its order and weighting, its
// words against the claims and job files, the timeline, the receipts, the
// keyboard, contrast and layout shift. Playwright's config asks for reduced
// motion by default.

const CONTENT = path.resolve(import.meta.dirname, '../../../apps/site/content')
interface Claim {
  subject: string
  text: string
}
interface Job {
  company: string
  title: string
  display: string
}
const CLAIMS = parse(readFileSync(path.join(CONTENT, 'claims.yaml'), 'utf8')) as Record<string, Claim>
const JOBS = Object.fromEntries(
  readdirSync(path.join(CONTENT, 'jobs')).map((name) => [
    name.slice(0, -5),
    parse(readFileSync(path.join(CONTENT, 'jobs', name), 'utf8')) as Job,
  ]),
)

const SHOWN = ['bleacher-report-1', 'bleacher-report-2', 'bleacher-report-3', 'bookshout-2', 'bookshout-3', 'bottle-rocket-2']
const SECTION = '#experience'

/** The claims' paragraphs, less their markers. */
const claimTexts = (page: Page): Promise<string[]> =>
  page.evaluate(
    `[...document.querySelectorAll('#experience p[data-claim]')].map((p) => { const copy = p.cloneNode(true); copy.querySelector('.ds-marker')?.remove(); return copy.textContent.replace(/\\s+/g, ' ').trim() })`,
  ) as Promise<string[]>

test.describe('what the section shows', () => {
  test('S1.1 FR-001 E1 E2 on a desktop the eyebrow, heading, timeline, featured card, cards and lines read in order after the Hopper story', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      const section = page.locator(SECTION)
      expect(
        await page.evaluate(`document.querySelector('#hopper').compareDocumentPosition(document.querySelector('#experience')) & 4`),
      ).toBe(4)
      const eyebrow = section.locator('.ds-eyebrow')
      await expect(eyebrow).toHaveText('Experience · Before Hopper')
      await expect(eyebrow).toHaveCSS('text-transform', 'uppercase')
      await expect(section.getByRole('heading', { level: 2 })).toHaveText('Android for brands, a startup and a sports media platform')
      const order = (await page.evaluate(
        `[...document.querySelectorAll('#experience .experience__timeline, #experience article, #experience .experience__lines')].map((el) => el.id || el.className.split(' ')[0])`,
      )) as string[]
      expect(order).toEqual([
        'experience__timeline',
        'experience-bleacher-report',
        'experience-bookshout',
        'experience-bottle-rocket',
        'experience__lines',
      ])
      await expect(section.getByRole('heading', { level: 3 })).toHaveText([
        'Bleacher Report · Senior Android Developer',
        'BookShout · Senior Mobile Engineer',
        'Bottle Rocket · Android Developer',
      ])
    }
  })

  test('S1.2 S1.3 SC-003 the featured card has its kicker, stats and claims; the cards their kickers, claims and tags', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const featured = page.locator('#experience-bleacher-report')
    await expect(featured).toHaveClass(/ds-card--highlight/)
    await expect(featured.locator('.ds-card__kicker')).toHaveText('Sports media · Sep 2019 – Apr 2022')
    await expect(featured.locator('.ds-stat dd')).toHaveText(['10M+', 'Promoted'])
    await expect(featured.locator('.ds-stat dt')).toHaveText(["B/R's app installs on Google Play", 'Senior Android Developer, Dec 2020'])
    await expect(featured.locator('[data-claim]')).toHaveCount(3)
    const bookshout = page.locator('#experience-bookshout')
    await expect(bookshout.locator('.ds-card__kicker')).toHaveText('Startup bet · Nov 2017 – Mar 2018')
    await expect(bookshout.getByRole('list', { name: 'BookShout, tags' }).locator('li')).toHaveText([
      'Kotlin',
      'Architecture Components',
      'RxJava 2',
    ])
    const bottle = page.locator('#experience-bottle-rocket')
    await expect(bottle.locator('.ds-card__kicker')).toHaveText('Brands · Oct 2015 – Nov 2017')
    await expect(bottle.getByRole('list', { name: 'Bottle Rocket, brands' }).locator('li')).toHaveText([
      'Coca-Cola Freestyle',
      'AskPETMD',
      'Starwood SPG',
      'Chewy',
    ])
    await expect(page.locator('#experience article')).toHaveCount(3)
  })

  test('S1.4 SC-003 the lines: RealPage and enterprise IT dated, with no description or receipt, then education', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const lines = page.locator('#experience .experience__line')
    await expect(lines.locator('dt')).toHaveText(['Apr 2018 – Sep 2019', '2008 – 2015', 'Education'])
    await expect(lines.locator('dd')).toHaveText([
      'RealPage · Lead Android Developer',
      'Harley-Davidson and Infosys · Enterprise IT',
      CLAIMS['education-1']?.text ?? '',
    ])
    await expect(lines.locator('.ds-marker, .ds-receipts')).toHaveCount(0)
  })

  test('S1.5 E3 E4 on a phone, and at 320, the parts stack in the same order and nothing scrolls sideways', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'dark' })
      await openHome(page)
      expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width}`).toBe(
        true,
      )
      const tops = await page
        .locator('#experience .experience__row, #experience [data-claim], #experience .experience__line')
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top))
      expect(tops).toEqual([...tops].sort((a, b) => a - b))
      // Each row's bar sits under its text.
      const rows = (await page.evaluate(
        `[...document.querySelectorAll('#experience .experience__row')].map((r) => [r.querySelector('a').getBoundingClientRect().bottom, r.querySelector('svg').getBoundingClientRect().top])`,
      )) as [number, number][]
      for (const [text, bar] of rows) expect(bar).toBeGreaterThanOrEqual(text)
    }
  })

  test('S1.6 SC-006 FR-008 the section has no motion of its own, no script but the previews script, no inline style, and the page shifts nothing as it loads', async ({
    page,
  }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await page.goto('about:blank')
      await enter(page, { viewport, theme: 'light' }, 'no-preference')
      await page.addInitScript(
        `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
      )
      await page.goto(`${HOME}#experience`)
      await page.waitForTimeout(3000)
      expect(await page.evaluate('window.__shift'), `${viewport.width}`).toBe(0)
      // Spec 027's MA-16 underlines a deep link's heading once; that's the frame's motion, not the section's (D209).
      // Spec 028's reveal plays once as a deep link lands, and is done by now; its blocks carry their timing as
      // --rv-* custom properties, set at run time, never in the markup (D211).
      expect(await page.evaluate(`document.getAnimations().filter((a) => a.animationName !== 'ds-jump' && a.effect.target.closest('#experience')).length`)).toBe(0)
      expect(await onlyPreviewScript(page)).toBe(true)
      expect(await page.locator('#experience [style]:not([data-rv], [data-rv] *)').count()).toBe(0)
    }
  })
})

test.describe('the timeline', () => {
  test('S2.1 S2.2 SC-002 FR-005 every job newest first, with its dates, company and title, each row a link to its place', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const list = page.getByRole('list', { name: 'Timeline, newest first' })
    const rows = list.locator(':scope > li')
    await expect(rows).toHaveCount(Object.keys(JOBS).length)
    const order = ['hopper', 'bleacher-report', 'realpage', 'bookshout', 'bottle-rocket', 'enterprise-it']
    await expect(rows.locator('.experience__company')).toHaveText(order.map((id) => JOBS[id]?.company ?? ''))
    await expect(rows.locator('.experience__title')).toHaveText(order.map((id) => JOBS[id]?.title ?? ''))
    await expect(rows.locator('.experience__dates')).toHaveText([
      'Apr 2022 – Oct 2026',
      'Sep 2019 – Apr 2022',
      'Apr 2018 – Sep 2019',
      'Nov 2017 – Mar 2018',
      'Oct 2015 – Nov 2017',
      'Nov 2008 – Oct 2015',
    ])
    const hrefs = await rows.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    expect(hrefs).toEqual(order.map((id) => (id === 'hopper' ? '#hopper' : `#experience-${id}`)))
    for (const href of hrefs) await expect(page.locator(href ?? '')).toHaveCount(1)
    await rows.first().locator('a').click()
    await expect(page).toHaveURL(/#hopper$/)
  })

  test('S2.3 each bar is hidden from screen readers, and Hopper, the featured job, the cards and the lines take their own fills', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await expect(page.locator('#experience .experience__bar[aria-hidden="true"]')).toHaveCount(6)
    const fills = (await page.evaluate(
      `[...document.querySelectorAll('#experience .experience__span')].map((r) => getComputedStyle(r).fill)`,
    )) as string[]
    expect(fills[0]).toBe(RGB.light.accent)
    expect(fills[1]).toBe(RGB.light.ink)
    expect(new Set(fills).size).toBe(4)
  })
})

test.describe('the words', () => {
  test('S3.1 S3.2 SC-001 every paragraph is a public claim as written, the lines are job files and the degree claim, and no note shows', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    expect(await claimTexts(page)).toEqual(SHOWN.map((id) => CLAIMS[id]?.text))
    const paragraphs = (await page.evaluate(
      `[...document.querySelectorAll('#experience p')].filter((p) => !p.closest('.ds-receipts') && !p.matches('.ds-eyebrow')).length`,
    )) as number
    expect(paragraphs).toBe(SHOWN.length)
    const body = (await page.locator(SECTION).textContent()) ?? ''
    for (const [id, claim] of Object.entries(CLAIMS)) {
      if (SHOWN.includes(id) || id === 'education-1') continue
      expect(body, id).not.toContain(claim.text)
    }
    for (const note of ['The site shows only this dated line', 'Brad calls it', 'risk-taker']) expect(body).not.toContain(note)
  })
})

// Amended by spec 026 (D208): each card gathers its receipts in one drawer.
test.describe('the receipts', () => {
  // Amended by spec 034 (D219): the Hopper story's three new claims move Experience's numbers up by three, here and below.
  test('S4.1 S4.3 SC-004 FR-006 six markers, 16 to 21, each with its row in its card’s drawer; the ask-me rows point to Brad', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const markers = page.locator('#experience [data-claim] > a.ds-marker')
    await expect(markers).toHaveText(['16', '17', '18', '19', '20', '21'])
    await expect(page.locator('#experience .ds-receipts__drawer')).toHaveCount(3)
    await expect(page.locator('#experience .ds-receipts__row')).toHaveCount(6)
    for (const n of [13, 14, 16, 17, 18]) {
      const marker = page.getByRole('link', { name: `Receipt ${n}, ask Brad` })
      await expect(marker).toHaveClass(/ds-marker--ask/)
      const row = page.locator((await marker.getAttribute('href')) ?? '')
      await expect(row.locator('.ds-receipts__kind')).toHaveText('Ask me')
      // Spec 017 (D153): the drawer's ask link goes to the contact section.
      const drawer = page.locator('#experience .ds-receipts__drawer').filter({ has: row })
      await expect(drawer.locator('.ds-receipts__foot a')).toHaveAttribute('href', '#contact')
    }
    // Each number shows once on the page.
    const all = await page.locator('main [data-claim] > a.ds-marker').allTextContents()
    expect(new Set(all).size).toBe(all.length)
  })

  test('S4.2 R1 the 10M+ claim is proof, and its row links the Play listing', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const marker = page.getByRole('link', { name: 'Receipt 18, proof' })
    await expect(marker).not.toHaveClass(/ds-marker--ask/)
    await marker.click()
    await expect(page.locator('#experience-bleacher-report .ds-receipts__drawer')).toHaveAttribute('open', '')
    const row = page.locator('#receipt-bleacher-report-3')
    await expect(row).toHaveClass(/ds-receipts__row--proof/)
    await expect(row.getByRole('link', { name: 'play.google.com' })).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.bleacherreport.android.teamstream',
    )
  })

  test('S4.4 E1 E3 each card’s drawer follows its claims, beside the tags on a desktop, or a full-width bar on the featured card', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const boxes = (await page.evaluate(
        `[...document.querySelectorAll('#experience article')].map((c) => { const last = [...c.querySelectorAll('[data-claim]')].at(-1).getBoundingClientRect(); const s = c.querySelector('.ds-receipts__summary').getBoundingClientRect(); const r = c.querySelector('.ds-receipts').getBoundingClientRect(); const tag = [...c.querySelectorAll('.ds-chip')].at(-1)?.getBoundingClientRect(); return { lb: last.bottom, st: s.top, sl: s.left, sw: s.width, rw: r.width, tr: tag ? tag.right : null } })`,
      )) as { lb: number; st: number; sl: number; sw: number; rw: number; tr: number | null }[]
      expect(boxes).toHaveLength(3)
      for (const box of boxes) {
        expect(box.st, `${viewport.width}`).toBeGreaterThanOrEqual(box.lb)
        if (box.tr === null) expect(box.sw, `${viewport.width}`).toBe(box.rw)
        else if (viewport === DESKTOP) expect(box.sl, `${viewport.width}`).toBeGreaterThan(box.tr)
      }
    }
  })

  test('S4.5 R2 a drawer opens by its marker, a click on its control, Enter or Space, and closes again', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'dark' })
      await openHome(page)
      const drawer = page.locator('#experience-bookshout .ds-receipts__drawer')
      await page.getByRole('link', { name: 'Receipt 19, ask Brad' }).click()
      await expect(drawer).toHaveAttribute('open', '')
      await expect(page.locator('#receipt-bookshout-2')).toBeInViewport()
      const summary = drawer.locator('summary')
      await summary.click()
      await expect(drawer).not.toHaveAttribute('open')
      await summary.focus()
      await page.keyboard.press('Enter')
      await expect(drawer).toHaveAttribute('open', '')
      await page.keyboard.press('Space')
      await expect(drawer).not.toHaveAttribute('open')
    }
  })
})

test.describe('the keyboard and contrast', () => {
  // Amended by spec 026 (D208): Tab goes through a card's markers, then its Receipts control.
  test('S5.1 FR-009 F1 F2 Tab goes through the timeline rows, then each card’s markers and its drawer’s control, each with a 2-pixel accent ring at 3:1', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.locator('.hopper__topic:has(#hopper-mobile-remoteui-and-webviews) .ds-receipts__summary').focus()
      const expected = [
        ...['Hopper', 'Bleacher Report', 'RealPage', 'BookShout', 'Bottle Rocket', 'Harley-Davidson and Infosys'].map((company) => ({
          tag: 'a',
          label: company,
        })),
        ...[[13, 14, 15], [16, 17], [18]].flatMap((card) => [
          ...card.map((n) => ({ tag: 'a', label: `Receipt ${n}, ${n === 15 ? 'proof' : 'ask Brad'}` })),
          { tag: 'summary', label: 'Receipts' },
        ]),
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
      await page.getByRole('link', { name: 'Receipt 16, ask Brad' }).click()
      await page.locator('#experience-bleacher-report .ds-receipts__summary').focus()
      // Amended by spec 030 (D213): rows 13 and 14's "Ask me" are links to the chat, before row 15's source.
      for (const label of ['Ask me about receipt 13', 'Ask me about receipt 14', 'play.google.com', 'Ask Brad about these']) {
        await page.keyboard.press('Tab')
        expect((await focused(page))?.label).toBe(label)
      }
    }
  })

  test("S5.2 FR-001 the header's Experience link reaches the section, its heading in view", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const link = page.locator('.ds-header__nav').first().getByRole('link', { name: 'Experience' })
    await expect(link).toHaveAttribute('href', '#experience')
    await link.click()
    await expect(page).toHaveURL(/#experience$/)
    await expect(page.locator('#experience-heading')).toBeInViewport()
  })

  // Amended by spec 026 (D208): the open drawers' text, on its card.
  test('S5.4 FR-009 every text in the section meets 4.5:1, on the page, cards, stats and open drawers, in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.evaluate(`document.querySelectorAll('#experience details').forEach((d) => { d.open = true })`)
      const pairs = (await page.evaluate(String.raw`(() => {
        const bg = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const sel = '#experience .ds-eyebrow, #experience h2, #experience h3, #experience .ds-card__kicker, #experience [data-claim], #experience .ds-chip, #experience .ds-stat dt, #experience .ds-stat dd, #experience .experience__dates, #experience .experience__company, #experience .experience__title, #experience .experience__line dt, #experience .experience__line dd, #experience .ds-receipts__label, #experience .ds-receipts__sum, #experience .ds-receipts__title, #experience .ds-receipts__kind, #experience .ds-receipts__source, #experience .ds-receipts__foot a'
        return [...document.querySelectorAll(sel)].map((el) => [getComputedStyle(el).color, bg(el), el.className || el.tagName])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(60)
      for (const [color, bg, what] of pairs) expect(contrast(color, bg), `${theme} ${what}: ${color} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
