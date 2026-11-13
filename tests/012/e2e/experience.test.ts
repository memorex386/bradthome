import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { questionOf } from '../../../apps/site/src/components/ds/proof.ts'
import { RECEIPT_TITLES } from '../../../apps/site/src/components/home/experience.ts'
import { RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, HOME, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { claimsIn, landing, openOnClaim, RETIRED, ringOf } from '../../011/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 012's Experience section in the browser: its order and weighting, its
// words against the claims and job files, the timeline, each claim's anchor
// and sparkle and the 10M+ stat's link (spec 038), the keyboard, contrast and
// layout shift. Playwright's config asks for reduced motion by default.

const CONTENT = path.resolve(import.meta.dirname, '../../../apps/site/content')
interface Claim {
  subject: string
  text: string
  evidence: string[]
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
/** The Bleacher Report app's Google Play listing, the 10M+ claim's one source. */
const PLAY = 'https://play.google.com/store/apps/details?id=com.bleacherreport.android.teamstream'

/** The claims' paragraphs. Amended by spec 038 (D230): a claim's sparkle holds no words, so a claim reads as its text alone. */
const claimTexts = (page: Page): Promise<string[]> =>
  page.evaluate(
    `[...document.querySelectorAll('#experience p[data-claim]')].map((p) => p.textContent.replace(/\\s+/g, ' ').trim())`,
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
    // Amended by spec 038 (D229): the 10M+ stat links its claim's Play listing, its host in a second <dd> under its
    // label, with the outside-link mark and its preview card; "Promoted" links nothing.
    await expect(featured.locator('.ds-stat dd:first-of-type')).toHaveText(['10M+', 'Promoted'])
    await expect(featured.locator('.ds-stat dt')).toHaveText(["B/R's app installs on Google Play", 'Senior Android Developer, Dec 2020'])
    await expect(featured.locator('.ds-stat')).toHaveClass([/^ds-stat ds-stat--link$/, /^ds-stat$/])
    const link = featured.locator('.ds-stat .ds-stat__source a.ds-stat__link')
    await expect(link).toHaveText('play.google.com')
    await expect(link).toHaveAttribute('href', PLAY)
    await expect(link).toHaveAttribute('data-preview', /^preview-experience-bleacher-report-1-/)
    await expect(link.locator('.ds-stat__out')).toHaveCount(1)
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

  // Amended by spec 038 (D229, D230): no line holds a sparkle, an anchor or a source, as none held a receipt.
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
    await expect(lines.locator('.ds-claim-ask, .ds-sources, [id^="receipt-"], .ds-marker, .ds-receipts')).toHaveCount(0)
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
    // Amended by spec 038 (D229): there's no drawer to leave out, and no Experience card lists sources.
    const paragraphs = (await page.evaluate(
      `[...document.querySelectorAll('#experience p')].filter((p) => !p.matches('.ds-eyebrow')).length`,
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

// Amended by spec 038 (D229, D230): the numbered markers and spec 026's drawers are gone. Each claim carries the anchor
// its receipt had and ends with the sparkle that asks about it, and the 10M+ claim's link shows on its stat.
test.describe('the claims and their proof', () => {
  test('S4.1 S4.3 SC-004 FR-006 six claims, each with its anchor and one sparkle, named by its title, whose question quotes it and which goes to Contact; each anchor and question shows once on the page', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const claims = await claimsIn(page, SECTION)
    expect(claims.map((claim) => claim.claim)).toEqual(SHOWN)
    for (const id of SHOWN) {
      const text = CLAIMS[id]?.text ?? ''
      expect(
        claims.find((entry) => entry.claim === id),
        id,
      ).toEqual({
        id: `receipt-${id}`,
        claim: id,
        text,
        asks: 1,
        ends: true,
        // Spec 017 (D153): with no script, the sparkle goes to the contact section.
        href: '#contact',
        question: questionOf(text),
        tip: 'Ask about this',
        name: `Ask about this: ${RECEIPT_TITLES[id]}`,
        words: '',
      })
      await expect(page.locator(`#receipt-${id} .ds-claim-ask`)).toHaveAccessibleName(`Ask about this: ${RECEIPT_TITLES[id]}`)
    }
    await expect(page.locator(`${SECTION} .ds-marker, ${SECTION} .ds-receipts, ${SECTION} details, ${SECTION} .ds-sources`)).toHaveCount(0)
    const body = (await page.locator(SECTION).textContent()) ?? ''
    for (const words of RETIRED) expect(body).not.toContain(words)
    // Each anchor shows once on the page, on its claim, and each of the page's 30 sparkles asks its own question.
    const anchors = await page
      .locator('main [id^="receipt-"]')
      .evaluateAll((items) => items.map((item) => [item.id, item.matches('.ds-claim')]))
    expect(anchors).toHaveLength(30)
    expect(new Set(anchors.map(([id]) => id)).size).toBe(30)
    for (const [id, claim] of anchors) expect(claim, String(id)).toBe(true)
    const questions = await page.locator('main .ds-claim-ask').evaluateAll((asks) => asks.map((ask) => ask.getAttribute('data-chat-ask')))
    expect(questions).toHaveLength(30)
    expect(new Set(questions).size).toBe(30)
  })

  test('S4.2 R1 the 10M+ claim’s stat links its Play listing, its host under its label, and a tap anywhere on the stat opens it', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const stat = page.locator('#experience-bleacher-report .ds-stat--link')
    await expect(stat).toHaveCount(1)
    await expect(stat.locator('dt')).toHaveText("B/R's app installs on Google Play")
    await expect(stat.locator('dd').first()).toHaveText('10M+')
    const link = stat.getByRole('link', { name: 'play.google.com' })
    await expect(link).toHaveAttribute('href', PLAY)
    const label = await stat.locator('dt').boundingBox()
    const host = await link.boundingBox()
    expect(host?.y ?? 0).toBeGreaterThanOrEqual((label?.y ?? 0) + (label?.height ?? 0) - 1)
    // The link's box covers the stat, so its middle and its corners all reach the link.
    await stat.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const hits = await stat.evaluate((el) => {
      const box = el.getBoundingClientRect()
      return [
        [0.5, 0.5],
        [0.08, 0.1],
        [0.92, 0.9],
      ].map(
        ([x = 0, y = 0]) =>
          (el.ownerDocument.elementFromPoint(box.left + box.width * x, box.top + box.height * y)?.closest('.ds-stat__link') ?? null) !==
          null,
      )
    })
    expect(hits).toEqual([true, true, true])
    // The claim it backs ends with its sparkle like any other.
    await expect(page.locator('#receipt-bleacher-report-3 .ds-claim-ask')).toHaveAttribute(
      'data-chat-ask',
      questionOf(CLAIMS['bleacher-report-3']?.text ?? ''),
    )
  })

  // Amended by spec 038 (D229): there's no drawer to place; each card's tags follow its claims directly and end it.
  test('S4.4 E1 E3 each card’s tags follow its claims directly and end the card, and the featured card’s stats come before its claims', async ({
    page,
  }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const parts = (await page.evaluate(
        `[...document.querySelectorAll('#experience article')].map((c) => [...c.children].map((child) => child.classList[0]))`,
      )) as string[][]
      expect(parts).toEqual([
        ['experience__feature-top', 'ds-claims'],
        ['experience__card-head', 'ds-claims', 'ds-chips'],
        ['experience__card-head', 'ds-claims', 'ds-chips'],
      ])
      const boxes = (await page.evaluate(
        `[...document.querySelectorAll('#experience article')].map((c) => { const claims = c.querySelector('.ds-claims').getBoundingClientRect(); const top = c.firstElementChild.getBoundingClientRect(); const tags = c.querySelector('.ds-chips')?.getBoundingClientRect(); return { ct: claims.top, cb: claims.bottom, hb: top.bottom, tt: tags ? tags.top : null } })`,
      )) as { ct: number; cb: number; hb: number; tt: number | null }[]
      expect(boxes).toHaveLength(3)
      for (const box of boxes) {
        expect(box.ct, `${viewport.width}`).toBeGreaterThanOrEqual(box.hb)
        if (box.tt !== null) expect(box.tt, `${viewport.width}`).toBeGreaterThanOrEqual(box.cb)
      }
    }
  })

  // Amended by spec 038 (D229): the drawers are gone, so nothing opens or closes. A link to a claim, as a source in a
  // chat answer is, lands on the claim, which tints while it's the target.
  test('S4.5 R2 a link to a claim’s anchor lands on it, in view and tinted, on a desktop and a phone', async ({ page }) => {
    for (const [viewport, theme, tint] of [
      [DESKTOP, 'dark', 'rgb(28, 36, 64)'],
      [PHONE, 'light', 'rgb(234, 240, 254)'],
    ] as const) {
      await page.goto('about:blank')
      await enter(page, { viewport, theme })
      await openOnClaim(page, 'bookshout-2')
      await expect(page.locator('#receipt-bookshout-2')).toBeInViewport()
      expect(await landing(page, 'bookshout-2')).toMatchObject({ target: true, background: tint })
    }
  })
})

test.describe('the keyboard and contrast', () => {
  // Amended by spec 038 (D229, D230): from the Hopper story's last sparkle, Tab goes through the timeline's rows, the
  // 10M+ stat's link, then each card's sparkles. A sparkle draws its ring around its disc, and a linked stat around the
  // whole stat.
  test('S5.1 FR-009 F1 F2 Tab goes through the timeline rows, the 10M+ stat, then each card’s sparkles, each with a 2-pixel accent ring at 3:1', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.locator('#receipt-hopper-mobile-remoteui-and-webviews-4 .ds-claim-ask').focus()
      const expected = [
        ...['Hopper', 'Bleacher Report', 'RealPage', 'BookShout', 'Bottle Rocket', 'Harley-Davidson and Infosys'].map((company) => ({
          label: company,
          on: 'self',
        })),
        { label: 'play.google.com', on: 'stat' },
        ...SHOWN.map((id) => ({ label: `Ask about this: ${RECEIPT_TITLES[id]}`, on: 'disc' })),
      ]
      for (const step of expected) {
        await page.keyboard.press('Tab')
        const now = await ringOf(page)
        expect(now?.tag, `${theme} ${step.label}`).toBe('a')
        expect(now?.label, theme).toContain(step.label)
        expect(now?.on, `${theme} ${step.label}`).toBe(step.on)
        expect(now?.outline).toBe('solid')
        expect(now?.width ?? 0).toBeGreaterThanOrEqual(2)
        expect(now?.color).toBe(RGB[theme].accent)
        expect(contrast(now?.color ?? '', RGB[theme].bg)).toBeGreaterThanOrEqual(3)
        expect(contrast(now?.color ?? '', RGB[theme].surface)).toBeGreaterThanOrEqual(3)
      }
      // Spec 038 (D229) retires the drawers, so there's no drawer's own links to Tab through after its control.
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

  // Amended by spec 038 (D229): the drawers are gone; the 10M+ stat's host is its link, on the stat.
  test('S5.4 FR-009 every text in the section meets 4.5:1, on the page, cards and stats, the stat’s link included, in both themes', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      const pairs = (await page.evaluate(String.raw`(() => {
        const bg = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const sel = '#experience .ds-eyebrow, #experience h2, #experience h3, #experience .ds-card__kicker, #experience [data-claim], #experience .ds-chip, #experience .ds-stat dt, #experience .ds-stat dd, #experience .ds-stat__link, #experience .experience__dates, #experience .experience__company, #experience .experience__title, #experience .experience__line dt, #experience .experience__line dd'
        return [...document.querySelectorAll(sel)].map((el) => [getComputedStyle(el).color, bg(el), el.className || el.tagName])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(45)
      expect(pairs.filter(([, , what]) => what === 'ds-stat__link')).toHaveLength(1)
      for (const [color, bg, what] of pairs) expect(contrast(color, bg), `${theme} ${what}: ${color} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
