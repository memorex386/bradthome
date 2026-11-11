import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { DESKTOP, enter, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { compact, readPdf } from '../../015/helpers/pdf.ts'
import { FILES, ROLES } from '../../../apps/site/src/components/resume/resume.ts'
import { CARD, repoCounts } from '../helpers/e2e.ts'

// Spec 033's card in the browser, on the build the pinned container serves:
// its place and framing on every page, the counts against the checkout, the
// build's date, the links and receipts, the PDFs that leave it out, and the
// footer (S1.x, S2.x, S3.x, S6.1, S6.2). Playwright's config asks for reduced
// motion by default.

const CONTENT = path.resolve(import.meta.dirname, '../../../apps/site/content')
const CLAIMS = parse(readFileSync(path.join(CONTENT, 'claims.yaml'), 'utf8')) as Record<string, { text: string; evidence: string[] }>
const ON_CARD = ['bradthome-com-1', 'bradthome-com-2', 'bradthome-com-3', 'bradthome-com-4']
const PAGES = ['/', '/mobile', '/fullstack', '/ai'] as const
const REPO = 'https://github.com/memorex386/bradthome'
const AVOIDED = /one engineer|one person|team of AI agents|\bsolo\b|agents? (?:run|runs|ran) (?:the |this )?site/i
const squash = (text: string): string => text.replace(/\s+/g, ' ').trim()
const LABEL = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })

/** The card's words, less its markers and drawer: what a visitor reads on it. */
const cardWords = (page: Page): Promise<string> =>
  page.evaluate(
    `(() => { const copy = document.querySelector('${CARD}').cloneNode(true); copy.querySelectorAll('.ds-receipts').forEach((e) => e.remove()); return copy.textContent.replace(/\\s+/g, ' ').trim() })()`,
  ) as Promise<string>

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

  test('S1.2 SC-001 each role page shows the same card, with the same words, counts and receipts, after Sudoku World', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    let home = ''
    for (const address of PAGES) {
      await page.goto(address)
      expect(await page.locator('#side article').evaluateAll((cards) => cards.map((card) => card.id)), address).toEqual([
        'side-vindecoded',
        'side-sudoku-world',
        'side-bradthome-com',
      ])
      const words = squash((await page.locator(CARD).textContent()) ?? '')
      if (address === '/') home = words
      else expect(words, address).toBe(home)
    }
  })

  test("S1.3 FR-001 SC-004 it's never a headline, it follows Hopper and Experience, and it's no taller than VINDecoded's card", async ({
    page,
  }) => {
    for (const address of PAGES) {
      await enter(page, { viewport: DESKTOP, theme: 'light' })
      await page.goto(address)
      for (const text of await page.locator('h1, h2, .ds-eyebrow').allTextContents()) expect(text, address).not.toMatch(/bradthome\.com/i)
      for (const before of ['#hopper', '#experience'])
        expect(await page.evaluate(`document.querySelector('${before}').compareDocumentPosition(document.querySelector('${CARD}')) & 4`)).toBe(4)
    }
    for (const width of [320, 390, 430, 768, 1280]) {
      await enter(page, { viewport: { width, height: 800 }, theme: 'light' })
      await openHome(page)
      const [vindecoded, ours] = (await page.evaluate(
        `['#side-vindecoded', '${CARD}'].map((s) => document.querySelector(s).getBoundingClientRect().height)`,
      )) as [number, number]
      expect(ours, `${width}: ${ours} against ${vindecoded}`).toBeLessThanOrEqual(vindecoded)
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

test.describe('the claims and their receipts (S3)', () => {
  test('S3.1 SC-003 FR-003 the card shows bradthome-com-1 to -4, as written, each with a proof marker numbered on from Sudoku World\'s', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const last = Number(await page.locator('#side-sudoku-world a.ds-marker').last().textContent())
    await expect(page.locator(`${CARD} a.ds-marker`)).toHaveText(ON_CARD.map((_, at) => String(last + 1 + at)))
    await expect(page.locator(`${CARD} a.ds-marker.ds-marker--ask`)).toHaveCount(0)
    expect(await page.locator(`${CARD} [data-claim]`).evaluateAll((items) => items.map((item) => item.getAttribute('data-claim')))).toEqual(ON_CARD)
    const texts = (await page.evaluate(
      `[...document.querySelectorAll('${CARD} [data-claim]')].map((c) => { const copy = c.cloneNode(true); copy.querySelector('.ds-marker')?.remove(); return copy.textContent.replace(/\\s+/g, ' ').trim() })`,
    )) as string[]
    expect(texts).toEqual(ON_CARD.map((id) => squash(CLAIMS[id]?.text ?? '')))
  })

  test('S3.2 each row in its drawer links its record by host: the repo and the gallery, the working agreement, a release record, /evals', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await page.locator(`${CARD} .ds-receipts__summary`).click()
    for (const id of ON_CARD) {
      const row = page.locator(`#receipt-${id}`)
      await expect(row).toHaveClass(/ds-receipts__row--proof/)
      const evidence = CLAIMS[id]?.evidence ?? []
      const links = row.locator('a.ds-receipts__source')
      await expect(links).toHaveText(evidence.map((href) => new URL(href).host))
      expect(await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))).toEqual(evidence)
    }
    expect(CLAIMS['bradthome-com-1']?.evidence).toEqual([REPO, 'https://bradthome.com/design-system'])
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
    for (const href of hrefs) expect(href).toMatch(/^(?:https:\/\/github\.com\/memorex386\/bradthome(?:\/|$)|https:\/\/bradthome\.com\/|#receipt-bradthome-com-\d$)/)
    for (const local of ['/design-system', '/evals']) expect((await page.request.get(local)).status(), local).toBe(200)
  })

  test('S3.5 on a phone, and at 320, the card stacks in order and nothing scrolls sideways', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'dark' })
      await openHome(page)
      expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width}`).toBe(true)
      const tops = await page
        .locator(`${CARD} h3, ${CARD} .side__counts, ${CARD} .side__counted, ${CARD} [data-claim], ${CARD} .ds-receipts, ${CARD} .side__links`)
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top))
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
