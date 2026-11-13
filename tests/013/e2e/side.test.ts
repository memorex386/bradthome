import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { questionOf } from '../../../apps/site/src/components/ds/proof.ts'
import { RECEIPT_TITLES } from '../../../apps/site/src/components/home/side.ts'
import { RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, HOME, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { claimsIn, landing, openOnClaim, RETIRED, ringOf } from '../../011/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 013's "On the side" section in the browser: its order and framing, its
// words against the claims and project files, the closing rule, each claim's
// anchor and sparkle, the stats', links' and sources' public pages (spec
// 038), the keyboard, contrast and layout shift. Playwright's config asks for
// reduced motion by default.

const CONTENT = path.resolve(import.meta.dirname, '../../../apps/site/content')
interface Claim {
  subject: string
  text: string
  evidence: string[]
}
const CLAIMS = parse(readFileSync(path.join(CONTENT, 'claims.yaml'), 'utf8')) as Record<string, Claim>
const RULE = 'Never say the 1,235 PRs all went through the newer workflow.'
// Spec 033: bradthome.com's small card follows Sudoku World's, with four claims.
const SHOWN = [
  'vindecoded-2',
  'vindecoded-3',
  'vindecoded-7',
  'sudoku-world-1',
  'sudoku-world-2',
  'bradthome-com-1',
  'bradthome-com-2',
  'bradthome-com-3',
  'bradthome-com-4',
]
const SECTION = '#side'
const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()
/** A claim's words for a visitor: less the rule. */
const words = (id: string): string => {
  const text = CLAIMS[id]?.text ?? ''
  return id === 'vindecoded-7' ? text.trimEnd().slice(0, -RULE.length) : text
}
/** A claim's text as a visitor reads it: less the rule, its list lines run together. */
const visible = (id: string): string => squash(words(id).replace(/^\s*- /gm, ' '))

/** The VINDecoded app's store listings, the downloads claim's two sources (D133). */
const STORES = [
  'https://play.google.com/store/apps/details?id=com.mtsdealersolutions.vindecoded',
  'https://apps.apple.com/us/app/vindecoded/id1191483515',
]
/** bradthome.com's four sources (spec 038, Brad's Gate 1 card): each label, its host, and its link, on this site by its path. */
const SITE_SOURCES = [
  ['The design system', 'bradthome.com', '/design-system'],
  [
    'Each feature starts as a spec Brad approves',
    'github.com',
    'https://github.com/memorex386/bradthome/blob/main/docs/working-agreement.md',
  ],
  ["A release's written record", 'github.com', 'https://github.com/memorex386/bradthome/blob/main/docs/releases/v2.5.0.md'],
  ['The latest eval run, case by case', 'bradthome.com', '/evals'],
] as const

/** Each claim's text. Amended by spec 038 (D230): a claim's sparkle holds no words, so nothing is taken out. */
const claimTexts = (page: Page): Promise<string[]> =>
  page.evaluate(
    `[...document.querySelectorAll('#side [data-claim]')].map((c) => [...c.querySelectorAll('p, li')].map((e) => e.textContent).join(' ').replace(/\\s+/g, ' ').trim())`,
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
      // Spec 033: bradthome.com's card comes third.
      await expect(section.locator('article')).toHaveCount(3)
      expect(await section.locator('article').evaluateAll((cards) => cards.map((card) => card.id))).toEqual([
        'side-vindecoded',
        'side-sudoku-world',
        'side-bradthome-com',
      ])
      await expect(section.getByRole('heading', { level: 3 })).toHaveText(['VINDecoded', 'Sudoku World', 'bradthome.com'])
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
    // Amended by spec 038 (D229): each stat links its store listing, its host in a second <dd> under its label, with
    // the outside-link mark and its preview card.
    await expect(vd.locator('.ds-stat dd:first-of-type')).toHaveText(['1M+', '400K+'])
    await expect(vd.locator('.ds-stat dt')).toHaveText(['Android downloads · 4.5 stars', 'iOS downloads · 4.7 stars'])
    await expect(vd.locator('.ds-stat')).toHaveClass([/^ds-stat ds-stat--link$/, /^ds-stat ds-stat--link$/])
    const stats = vd.locator('.ds-stat .ds-stat__source a.ds-stat__link')
    await expect(stats).toHaveText(['play.google.com', 'apps.apple.com'])
    expect(await stats.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(STORES)
    await expect(stats.first()).toHaveAttribute('data-preview', /^preview-side-vindecoded-1-/)
    await expect(stats.last()).toHaveAttribute('data-preview', /^preview-side-vindecoded-2-/)
    await expect(stats.locator('.ds-stat__out')).toHaveCount(2)
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
    // Spec 038 (S1.5): their stats and links already show every page their claims hold, so neither lists sources.
    await expect(page.locator('#side-vindecoded .ds-sources, #side-sudoku-world .ds-sources')).toHaveCount(0)
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
      // Amended by spec 038 (D229): bradthome.com's sources sit between its claims and its link.
      const tops = await page
        .locator('#side h2, #side h3, #side .ds-stats, #side [data-claim], #side .ds-sources, #side .side__links')
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
      // Spec 027's MA-16 underlines a deep link's heading once; that's the frame's motion, not the section's (D209).
      // Spec 028's reveal plays once as a deep link lands, and is done by now; its blocks carry their timing as
      // --rv-* custom properties, set at run time, never in the markup (D211).
      expect(await page.evaluate(`document.getAnimations().filter((a) => a.animationName !== 'ds-jump' && a.effect.target.closest('#side')).length`)).toBe(0)
      expect(await onlyPreviewScript(page)).toBe(true)
      expect(await page.locator('#side [style]:not([data-rv], [data-rv] *)').count()).toBe(0)
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
    // Amended by spec 038 (D229): there's no drawer to leave out; bradthome.com's "Sources" label is a paragraph of its own.
    const paragraphs = (await page.evaluate(
      `[...document.querySelectorAll('#side p')].filter((p) => !p.closest('[data-claim]') && !p.matches('.ds-eyebrow, .side__links, .side__counted, .ds-sources__label')).length`,
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
    // Amended by spec 038 (D230): the last item ends with the claim's sparkle, which adds no words, and its question
    // holds the lead and the items, joined by "; ", and never the rule.
    await expect(claim.locator('li')).toHaveText([
      '1,235 merged PRs from June 13 to Oct 28, 2026, 83% of them from agent branches',
      '1,530 test files',
      '113 runbooks',
      '46 ADRs',
    ])
    await expect(claim.locator('.ds-claim-ask')).toHaveCount(1)
    const ask = claim.locator('li').last().locator('.ds-claim__end .ds-claim-ask')
    await expect(ask).toHaveAttribute(
      'data-chat-ask',
      "Tell me more about this: “The case study's counts, measured on 10/28: 1,235 merged PRs from June 13 to Oct 28, 2026, 83% of them from agent branches; 1,530 test files; 113 runbooks; 46 ADRs”",
    )
    const body = (await page.locator('body').textContent()) ?? ''
    expect(body).not.toContain('Never say')
    expect(body).not.toContain('newer workflow')
    expect(body).not.toMatch(/all 1,235/)
    expect(
      await page
        .locator('main .ds-claim-ask')
        .evaluateAll((asks) => asks.some((item) => /Never say|newer workflow/.test(item.getAttribute('data-chat-ask') ?? ''))),
    ).toBe(false)
  })
})

// Amended by spec 038 (D229, D230): the numbered markers and spec 026's drawers are gone. Each claim carries the anchor
// its receipt had and ends with the sparkle that asks about it, and each card shows its claims' public pages at rest.
test.describe('the claims and their proof', () => {
  test('S3.1 SC-003 FR-006 the nine claims each carry their anchor and end with one sparkle, named by its title, whose question quotes them and which goes to Contact', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const claims = await claimsIn(page, SECTION)
    expect(claims.map((claim) => claim.claim)).toEqual(SHOWN)
    for (const id of SHOWN) {
      expect(
        claims.find((entry) => entry.claim === id),
        id,
      ).toEqual({
        id: `receipt-${id}`,
        claim: id,
        text: visible(id),
        asks: 1,
        ends: true,
        // Spec 017 (D153): with no script, the sparkle goes to the contact section.
        href: '#contact',
        question: questionOf(words(id)),
        tip: 'Ask about this',
        name: `Ask about this: ${RECEIPT_TITLES[id]}`,
        words: '',
      })
      await expect(page.locator(`#receipt-${id} .ds-claim-ask`)).toHaveAccessibleName(`Ask about this: ${RECEIPT_TITLES[id]}`)
    }
    const anchors = await page.locator(`${SECTION} [id^="receipt-"]`).evaluateAll((items) => items.map((item) => item.matches('.ds-claim')))
    expect(anchors).toEqual(SHOWN.map(() => true))
    await expect(page.locator(`${SECTION} .ds-marker, ${SECTION} .ds-receipts, ${SECTION} details`)).toHaveCount(0)
    const body = (await page.locator(SECTION).textContent()) ?? ''
    for (const retired of RETIRED) expect(body).not.toContain(retired)
  })

  // Amended by spec 038 (D229): the pages show at rest, each once on its card: VINDecoded's on its stats and links,
  // Sudoku World's on its link, and bradthome.com's, but its repo, as its sources, each by its label and host.
  test('S3.2 R1 FR-007 every public page behind the claims shows at rest on its card, by its host', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const hrefs = async (selector: string): Promise<(string | null)[]> =>
      page.locator(selector).evaluateAll((links) => links.map((link) => link.getAttribute('href')))
    // VINDecoded: the downloads' stores on the stats, the site and the case study on the card's links.
    expect(await hrefs('#side-vindecoded .ds-stat__link')).toEqual(CLAIMS['vindecoded-3']?.evidence)
    expect(await hrefs('#side-vindecoded .side__links > a')).toEqual([
      ...(CLAIMS['vindecoded-2']?.evidence ?? []),
      ...(CLAIMS['vindecoded-7']?.evidence ?? []).map((href) => new URL(href).pathname),
    ])
    expect(await hrefs('#side-sudoku-world .side__links > a')).toEqual(CLAIMS['sudoku-world-1']?.evidence)
    // bradthome.com: its repo on its link, and its four other pages as its sources, under its claims.
    const card = page.locator('#side-bradthome-com')
    expect(await hrefs('#side-bradthome-com .side__links > a')).toEqual([CLAIMS['bradthome-com-1']?.evidence[0]])
    await expect(card.locator('.ds-sources__label')).toHaveText('Sources')
    const links = card.getByRole('list', { name: 'Sources' }).locator('a.ds-source')
    await expect(links.locator('.ds-source__label')).toHaveText(SITE_SOURCES.map(([label]) => label))
    await expect(links.locator('.ds-source__host')).toHaveText(SITE_SOURCES.map(([, host]) => host))
    expect(await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))).toEqual(
      SITE_SOURCES.map(([, , href]) => href),
    )
    // Only the two that leave the site carry the outside-link mark.
    expect(await links.evaluateAll((items) => items.map((item) => item.querySelector('.ds-source__out') !== null))).toEqual([
      false,
      true,
      true,
      false,
    ])
    await expect(page.locator(`${SECTION} .ds-sources`)).toHaveCount(1)
  })

  // Amended by spec 038 (D229): the drawers' ask-me rows are gone. The claim with no link reads as its words and its
  // sparkle, which goes to Contact, with nothing that says it lacks a link.
  test('S3.3 R2 the claim with no link reads as plain text that ends with its sparkle, pointing to Contact', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'dark' })
    await openHome(page)
    const claim = page.locator('#receipt-sudoku-world-2')
    await expect(claim).toHaveText(CLAIMS['sudoku-world-2']?.text ?? '')
    const ask = claim.locator('.ds-claim-ask')
    await expect(ask).toHaveAccessibleName('Ask about this: One Angular game on the web, Android and iOS')
    // Spec 017 (D153): with no script, it goes to the contact section.
    await expect(ask).toHaveAttribute('href', '#contact')
    await expect(page.locator('#side-sudoku-world .ds-sources')).toHaveCount(0)
    const card = (await page.locator('#side-sudoku-world').textContent()) ?? ''
    for (const retired of RETIRED) expect(card).not.toContain(retired)
  })

  // Amended by spec 038 (D229): there's no drawer to place. bradthome.com's sources sit under its claims, as wide as
  // them, above its link; every card's links follow its claims.
  test('S3.4 P1 P3 bradthome.com’s sources sit under its claims, as wide as them, above its link, and every card’s links follow its claims', async ({
    page,
  }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await openHome(page)
      const boxes = (await page.evaluate(
        `[...document.querySelectorAll('#side article')].map((c) => { const claims = c.querySelector('.ds-claims').getBoundingClientRect(); const sources = c.querySelector('.ds-sources')?.getBoundingClientRect(); const links = c.querySelector('.side__links').getBoundingClientRect(); return { cb: claims.bottom, cw: claims.width, st: sources ? sources.top : null, sb: sources ? sources.bottom : null, sw: sources ? sources.width : null, lt: links.top } })`,
      )) as { cb: number; cw: number; st: number | null; sb: number | null; sw: number | null; lt: number }[]
      expect(boxes.map((box) => box.st !== null)).toEqual([false, false, true])
      for (const box of boxes) {
        if (box.st !== null) {
          expect(box.st, `${viewport.width}`).toBeGreaterThanOrEqual(box.cb)
          expect(box.sw, `${viewport.width}`).toBe(box.cw)
        }
        expect(box.lt, `${viewport.width}`).toBeGreaterThanOrEqual(box.sb ?? box.cb)
      }
    }
  })

  // Amended by spec 038 (D229): the drawers are gone, so nothing opens or closes. A link to a claim, as a source in a
  // chat answer is, lands on the claim, which tints while it's the target.
  test('S3.5 a link to a claim’s anchor lands on it, in view and tinted, on a desktop and a phone', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await page.goto('about:blank')
      await enter(page, { viewport, theme: 'dark' })
      await openOnClaim(page, 'sudoku-world-2')
      await expect(page.locator('#receipt-sudoku-world-2')).toBeInViewport()
      expect(await landing(page, 'sudoku-world-2')).toMatchObject({ target: true, background: 'rgb(28, 36, 64)' })
    }
  })

  // Amended by spec 038 (D229): no link goes to a receipt's row; bradthome.com's sources on this site go by their paths.
  test('S3.6 every link in the section is https, the contact section (spec 017, D153), or a page the build holds', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const hrefs = await page.locator('#side a').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
    for (const href of hrefs) expect(href).toMatch(/^(https:\/\/|#contact$|\/vindecoded-agents$|\/design-system$|\/evals$)/)
    for (const local of ['/vindecoded-agents', '/design-system', '/evals']) {
      expect(hrefs, local).toContain(local)
      const response = await page.request.get(local)
      expect(response.status(), local).toBe(200)
    }
  })
})

test.describe('the keyboard and contrast', () => {
  // Amended by spec 038 (D229, D230): from Bottle Rocket's sparkle, Tab goes through each card's linked stats, its
  // claims' sparkles, its sources and its links. A sparkle draws its ring around its disc, and a linked stat around
  // the whole stat.
  test('S4.1 FR-009 F1 F2 Tab goes through each card’s stats, sparkles, sources and links, each with a 2-pixel accent ring at 3:1', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      await page.locator('#receipt-bottle-rocket-2 .ds-claim-ask').focus()
      const sparkle = (id: string) => ({ label: `Ask about this: ${RECEIPT_TITLES[id]}`, on: 'disc' })
      const link = (label: string) => ({ label, on: 'self' })
      const expected = [
        { label: 'play.google.com', on: 'stat' },
        { label: 'apps.apple.com', on: 'stat' },
        sparkle('vindecoded-2'),
        sparkle('vindecoded-3'),
        sparkle('vindecoded-7'),
        link('vindecoded.com'),
        link('Read the case study'),
        sparkle('sudoku-world-1'),
        sparkle('sudoku-world-2'),
        link('sudokuworld.app'),
        // Spec 033: bradthome.com's counts each link their records.
        link('decisions'),
        link('specs'),
        link('releases'),
        sparkle('bradthome-com-1'),
        sparkle('bradthome-com-2'),
        sparkle('bradthome-com-3'),
        sparkle('bradthome-com-4'),
        ...SITE_SOURCES.map(([label]) => link(label)),
        link('Read the source on GitHub'),
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
      // Spec 038 (D229) retires the drawers, so there's no drawer's own links to Tab through after its control: the
      // hosts they held are the stats' and links' above.
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

  // Amended by spec 038 (D229): the drawers are gone; the stats' hosts and bradthome.com's sources are on their cards.
  test('S4.4 FR-009 every text in the section meets 4.5:1, on the cards, stats, badge and sources, in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await openHome(page)
      const pairs = (await page.evaluate(String.raw`(() => {
        const bg = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c } return 'rgb(255, 255, 255)' }
        const sel = '#side .ds-eyebrow, #side h2, #side h3, #side .ds-card__kicker, #side [data-claim] p, #side [data-claim] li, #side .ds-stat dt, #side .ds-stat dd, #side .ds-stat__link, #side .side__badge:not(.side__badge--grid), #side .side__links > a, #side .ds-sources__label, #side .ds-source__label, #side .ds-source__host'
        return [...document.querySelectorAll(sel)].map((el) => [getComputedStyle(el).color, bg(el), el.className || el.tagName])
      })()`)) as [string, string, string][]
      expect(pairs.length).toBeGreaterThan(30)
      // The two stats' links, and bradthome.com's label and four sources' labels and hosts.
      expect(pairs.filter(([, , what]) => /^ds-stat__link|^ds-sources?__/.test(what))).toHaveLength(2 + 1 + 4 + 4)
      for (const [color, bg, what] of pairs) expect(contrast(color, bg), `${theme} ${what}: ${color} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
