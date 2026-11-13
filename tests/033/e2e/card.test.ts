import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { DESKTOP, enter, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { compact, readPdf } from '../../015/helpers/pdf.ts'
import { RECEIPT_TITLES } from '../../../apps/site/src/components/home/side.ts'
import { FILES, ROLES } from '../../../apps/site/src/components/resume/resume.ts'
import { CARD, repoCounts } from '../helpers/e2e.ts'

// Spec 033's card in the browser, on the build the pinned container serves:
// its place and framing on every page, the counts against the checkout, the
// build's date, the links and sources, the PDFs that leave it out, and the
// footer (S1.x, S2.x, S3.x, S6.1, S6.2). Playwright's config asks for reduced
// motion by default. Since spec 038 (D229, D230) the card shows its sources
// at rest, under its claims, and each claim ends with its sparkle, in place
// of the numbered markers and the receipts drawer.

const CONTENT = path.resolve(import.meta.dirname, '../../../apps/site/content')
const CLAIMS = parse(readFileSync(path.join(CONTENT, 'claims.yaml'), 'utf8')) as Record<string, { text: string; evidence: string[] }>
const ON_CARD = ['bradthome-com-1', 'bradthome-com-2', 'bradthome-com-3', 'bradthome-com-4']
const PAGES = ['/', '/mobile', '/fullstack', '/ai'] as const
const REPO = 'https://github.com/memorex386/bradthome'
const AVOIDED = /one engineer|one person|team of AI agents|\bsolo\b|agents? (?:run|runs|ran) (?:the |this )?site/i
const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()
const LABEL = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })

// Amended by spec 038 (D229): the drawer is gone, so all the card's text is what a visitor reads at rest, its
// sources' labels and hosts included; its sparkles hold no words.
/** The card's words: what a visitor reads on it. */
const cardWords = async (page: Page): Promise<string> => squash((await page.locator(CARD).textContent()) ?? '')

/** Each link on the card, in order: where it goes, its name, and the question a sparkle asks. */
const cardLinks = (page: Page): Promise<string[][]> =>
  page
    .locator(`${CARD} a`)
    .evaluateAll((links) =>
      links.map((link) => [
        link.getAttribute('href') ?? '',
        link.getAttribute('aria-label') ?? (link.textContent ?? '').replace(/\s+/g, ' ').trim(),
        link.getAttribute('data-chat-ask') ?? '',
      ]),
    ) as Promise<string[][]>

/** Each of the card's claims, in order: its id, anchor and text, its sparkles' names and questions, and whether the last ends it. */
const cardClaims = (page: Page): Promise<{ id: string; anchor: string; text: string; asks: string[][]; ends: boolean }[]> =>
  page.locator(`${CARD} [data-claim]`).evaluateAll((all) =>
    all.map((claim) => {
      const asks = [...claim.querySelectorAll('.ds-claim-ask')]
      const last = asks.at(-1)
      const after = claim.ownerDocument.createRange()
      if (last !== undefined) after.setStartAfter(last)
      after.setEnd(claim, claim.childNodes.length)
      return {
        id: claim.getAttribute('data-claim') ?? '',
        anchor: claim.id,
        text: (claim.textContent ?? '').replace(/\s+/g, ' ').trim(),
        asks: asks.map((ask) => [ask.getAttribute('aria-label') ?? '', ask.getAttribute('data-chat-ask') ?? '']),
        ends: last !== undefined && after.toString().trim() === '',
      }
    }),
  ) as Promise<{ id: string; anchor: string; text: string; asks: string[][]; ends: boolean }[]>

/** The records the card lists under its claims (spec 038's FR-003): where each goes, its label and host, and whether it leaves the site. */
const LISTED = [
  ['/design-system', 'The design system', 'bradthome.com', false],
  [`${REPO}/blob/main/docs/working-agreement.md`, 'Each feature starts as a spec Brad approves', 'github.com', true],
  [`${REPO}/blob/main/docs/releases/v2.5.0.md`, "A release's written record", 'github.com', true],
  ['/evals', 'The latest eval run, case by case', 'bradthome.com', false],
] as const

test.describe('where it shows (S1)', () => {
  test("S1.1 FR-001 SC-001 the home's third card is bradthome.com's small card, after Sudoku World's", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    expect(await page.locator('#side article').evaluateAll((cards) => cards.map((card) => card.id))).toEqual([
      'side-vindecoded',
      'side-sudoku-world',
      'side-bradthome-com',
    ])
    const card = page.locator(CARD)
    await expect(card).toHaveClass(/side__card--small/)
    await expect(card.getByRole('heading', { level: 3 })).toHaveText('bradthome.com')
    await expect(card.locator('.ds-card__kicker')).toHaveText('Built in the open')
    await expect(card.locator('.side__badge')).toHaveAttribute('aria-hidden', 'true')
    await expect(card.locator('.side__badge svg')).toHaveCount(1)
  })

  // Amended by spec 038 (D229, D230): no marker or drawer carries the receipts' words now, so the card's links, its
  // sparkles' names and questions with them, are compared beside its words.
  test('S1.2 SC-001 each role page shows the same card, with the same words, counts, sources and sparkles, after Sudoku World', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    let home = ''
    let homeLinks: string[][] = []
    for (const address of PAGES) {
      await page.goto(address)
      expect(await page.locator('#side article').evaluateAll((cards) => cards.map((card) => card.id)), address).toEqual([
        'side-vindecoded',
        'side-sudoku-world',
        'side-bradthome-com',
      ])
      const words = await cardWords(page)
      const links = await cardLinks(page)
      if (address === '/') {
        home = words
        homeLinks = links
      } else {
        expect(words, address).toBe(home)
        expect(links, address).toEqual(homeLinks)
      }
    }
    expect(homeLinks.length).toBeGreaterThan(8)
  })

  test("S1.3 FR-001 SC-004 it's never a headline, it follows Hopper and Experience, and less its sources it's no taller than VINDecoded's card", async ({
    page,
  }) => {
    for (const address of PAGES) {
      await enter(page, { viewport: DESKTOP, theme: 'light' })
      await page.goto(address)
      for (const text of await page.locator('h1, h2, .ds-eyebrow').allTextContents()) expect(text, address).not.toMatch(/bradthome\.com/i)
      for (const before of ['#hopper', '#experience'])
        expect(await page.evaluate(`document.querySelector('${before}').compareDocumentPosition(document.querySelector('${CARD}')) & 4`)).toBe(4)
    }
    // Amended by spec 038 (D229, on Brad's card): the card's four sources show at rest under its claims and may add
    // height, so the card is measured without its sources list, and the list is the only part that may pass VINDecoded's.
    for (const width of [320, 390, 430, 768, 1280]) {
      await enter(page, { viewport: { width, height: 800 }, theme: 'light' })
      await openHome(page)
      const [vindecoded, whole] = (await page.evaluate(
        `['#side-vindecoded', '${CARD}'].map((s) => document.querySelector(s).getBoundingClientRect().height)`,
      )) as [number, number]
      await page.evaluate(`document.querySelector('${CARD} .ds-sources').style.setProperty('display', 'none')`)
      const ours = (await page.evaluate(`document.querySelector('${CARD}').getBoundingClientRect().height`)) as number
      expect(ours, `${width}: ${ours} without its sources against ${vindecoded}`).toBeLessThanOrEqual(vindecoded)
      expect(whole, `${width}: the sources list adds height`).toBeGreaterThan(ours)
    }
  })

  test('S1.4 FR-009 no page that shows it calls Brad one engineer, one person or solo, or says agents run the site', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of PAGES) {
      await page.goto(address)
      expect((await page.locator('body').textContent()) ?? '', address).not.toMatch(AVOIDED)
    }
  })
})

test.describe('the counts (S2)', () => {
  test("S2.1 SC-002 FR-002 the three counts, in order, equal the checkout's records", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const counts = repoCounts()
    await expect(page.locator(`${CARD} .side__count-value`)).toHaveText([String(counts.decisions), String(counts.specs), String(counts.releases)])
    await expect(page.locator(`${CARD} .side__count-label`)).toHaveText(['decisions', 'specs', 'releases'])
    expect(await page.locator(`${CARD} [data-record]`).evaluateAll((els) => els.map((el) => el.getAttribute('data-record')))).toEqual([
      'decisions',
      'specs',
      'releases',
      'counted',
    ])
  })

  test("S2.2 the line under them dates the counts by the build's day", async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' })
    await openHome(page)
    const time = page.locator(`${CARD} .side__counted time`)
    const day = (await time.getAttribute('datetime')) ?? ''
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // The build ran just before these tests: its day is today's or yesterday's, never later.
    const age = (Date.now() - Date.parse(`${day}T00:00:00Z`)) / 86_400_000
    expect(age).toBeGreaterThan(-1)
    expect(age).toBeLessThan(3)
    await expect(time).toHaveText(LABEL.format(new Date(`${day}T00:00:00Z`)))
    await expect(page.locator(`${CARD} .side__counted`)).toHaveText(`Counted from the repo on ${LABEL.format(new Date(`${day}T00:00:00Z`))}.`)
  })

  test('S2.3 each count is a link to its records, named by its number and label', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const counts = repoCounts()
    for (const [n, label, href] of [
      [counts.decisions, 'decisions', `${REPO}/blob/main/docs/decisions/README.md`],
      [counts.specs, 'specs', `${REPO}/tree/main/specs`],
      [counts.releases, 'releases', `${REPO}/tree/main/docs/releases`],
    ] as const) {
      const link = page.locator(CARD).getByRole('link', { name: `${n} ${label}`, exact: true })
      await expect(link).toHaveAttribute('href', href)
    }
  })

  test('S2.4 FR-002 SC-002 nothing is fetched for the counts: no request to GitHub, while the page loads or the card comes into view', async ({
    page,
  }) => {
    const hosts: string[] = []
    page.on('request', (request) => hosts.push(new URL(request.url()).host))
    await enter(page, { viewport: PHONE, theme: 'light' })
    await openHome(page)
    await page.locator(CARD).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    expect(hosts.filter((host) => /github/.test(host))).toEqual([])
    expect(await page.locator(`${CARD} script`).count()).toBe(0)
  })

  test('S2.5 the card counts no pull requests', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    expect(await cardWords(page)).not.toMatch(/pull request|\bPRs?\b/i)
  })
})

test.describe('the claims and their sources (S3)', () => {
  // Amended by spec 038 (D229, D230): the numbered proof markers are gone. Each claim carries the anchor its receipt
  // had and ends with its sparkle, named by its title, which asks about its words.
  test('S3.1 SC-003 FR-003 the card shows bradthome-com-1 to -4, as written, each with its anchor and ending with its sparkle', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await expect(page.locator(`${CARD} .ds-marker, ${CARD} .ds-receipts`)).toHaveCount(0)
    expect(await cardClaims(page)).toEqual(
      ON_CARD.map((id) => ({
        id,
        anchor: `receipt-${id}`,
        text: squash(CLAIMS[id]?.text ?? ''),
        asks: [[`Ask about this: ${RECEIPT_TITLES[id] ?? ''}`, `Tell me more about this: “${CLAIMS[id]?.text ?? ''}”`]],
        ends: true,
      })),
    )
  })

  // Amended by spec 038 (D229): the drawer's rows are gone. Under the claims and before the card's link, "Sources"
  // lists every record the card doesn't already link, at rest, each with its label and host; the two on this site go
  // by their paths with no outside-link mark. The repo, bradthome-com-1's first, is the card's own link.
  test('S3.2 under its claims the card lists its records by label and host: the gallery, the working agreement, a release record, /evals', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const sources = page.locator(`${CARD} .ds-sources`)
    await expect(sources.locator('.ds-sources__label')).toHaveText('Sources')
    const list = sources.getByRole('list', { name: 'Sources' })
    await expect(list.getByRole('listitem')).toHaveCount(LISTED.length)
    const shown = await list
      .locator('a.ds-source')
      .evaluateAll((links) =>
        links.map((link) => [
          link.getAttribute('href') ?? '',
          (link.querySelector('.ds-source__label')?.textContent ?? '').trim(),
          (link.querySelector('.ds-source__host')?.textContent ?? '').trim(),
          link.querySelector('.ds-source__out') !== null,
        ]),
      )
    expect(shown).toEqual(LISTED.map((source) => [...source]))
    // Each record shows once on the card: the repo as its link, and the rest as its sources.
    expect(CLAIMS['bradthome-com-1']?.evidence).toEqual([REPO, 'https://bradthome.com/design-system'])
    expect(ON_CARD.flatMap((id) => CLAIMS[id]?.evidence ?? [])).toEqual([
      REPO,
      ...LISTED.map(([href]) => (href.startsWith('/') ? `https://bradthome.com${href}` : href)),
    ])
    // The list sits under the last claim and above the card's link.
    const tops = await page
      .locator(`${CARD} [data-claim], ${CARD} .ds-sources, ${CARD} .side__links`)
      .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top))
    expect(tops).toHaveLength(ON_CARD.length + 2)
    expect(tops).toEqual([...tops].sort((a, b) => a - b))
  })

  test("S3.3 the card's link is the repo's source, not bradthome.com from bradthome.com", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const links = page.locator(`${CARD} .side__links > a`)
    await expect(links).toHaveText(['Read the source on GitHub'])
    await expect(links).toHaveAttribute('href', REPO)
  })

  test('S3.4 every link on the card goes into the repo on GitHub or to bradthome.com, over https, and the gallery and /evals answer', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const hrefs = await page.locator(`${CARD} a`).evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
    // Amended by spec 038 (D229, D230): no marker links a row now. The card's two records on this site go by their
    // paths, so a preview stays there, and each claim's sparkle links the contact section, its no-script fallback.
    for (const href of hrefs)
      expect(href).toMatch(/^(?:https:\/\/github\.com\/memorex386\/bradthome(?:\/|$)|\/(?:design-system|evals)$|#contact$)/)
    expect(hrefs.filter((href) => href === '#contact')).toHaveLength(ON_CARD.length)
    expect(hrefs.filter((href) => href.startsWith('/'))).toEqual(['/design-system', '/evals'])
    for (const local of ['/design-system', '/evals']) expect((await page.request.get(local)).status(), local).toBe(200)
  })

  // Amended by spec 038 (D229): the sources take the drawer's place, under the claims.
  test('S3.5 on a phone, and at 320, the card stacks in order and nothing scrolls sideways', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'dark' })
      await openHome(page)
      expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width}`).toBe(true)
      const tops = await page
        .locator(
          `${CARD} h3, ${CARD} .side__counts, ${CARD} .side__counted, ${CARD} [data-claim], ${CARD} .ds-sources, ${CARD} .side__links`,
        )
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top))
      expect(tops).toHaveLength(ON_CARD.length + 5)
      expect(tops).toEqual([...tops].sort((a, b) => a - b))
    }
  })
})

test.describe('nothing else changes (S6)', () => {
  test('S6.1 FR-006 the PDFs leave the card out and stay two pages', async ({ request }) => {
    for (const role of ROLES) {
      const response = await request.get(`/resume/${FILES[role]}`)
      expect(response.status(), role).toBe(200)
      const pdf = await readPdf(new Uint8Array(await response.body()))
      expect(pdf.pages, role).toBeLessThanOrEqual(2)
      const text = compact(pdf.text.join(' '))
      for (const id of ON_CARD) expect(text, `${role} ${id}`).not.toContain(compact(CLAIMS[id]?.text.slice(0, 40) ?? ''))
      expect(text, role).not.toContain(compact('Built in the open'))
    }
  })

  test('S6.2 the footer reads as D210 set it', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const repo = page.locator('footer a.ds-footer__repo')
    await expect(repo).toHaveText('specs, tests and decisions on GitHub')
    await expect(repo).toHaveAttribute('href', REPO)
  })
})
