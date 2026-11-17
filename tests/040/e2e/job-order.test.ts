import { expect, type Page, test } from '@playwright/test'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { FILES, ROLES } from '../../../apps/site/src/components/resume/resume.ts'
import { DESKTOP, enter, NARROW } from '../../010/helpers/e2e.ts'
import { claimsIn } from '../../011/helpers/e2e.ts'
import { compact, readPdf } from '../../015/helpers/pdf.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { watchShifts } from '../../036/helpers/e2e.ts'

// Spec 040 in the browser: the Experience section's cards in date order with
// RealPage's card in place, on the home and each role page; the timeline; the
// PDFs as the site serves them; the corpus's links landing on the card; and
// what holds (D238). Playwright asks for reduced motion by default; the reveal
// test asks for no-preference. Baselines are in a11y-visual.test.ts.

const PAGES = ['/', '/mobile', '/fullstack', '/ai'] as const
/** The sizes Brad's brief names: a phone and a wide desktop. */
const SMALL = { width: 375, height: 812 } as const
const WIDE = { width: 1440, height: 900 } as const
const THEMES = ['light', 'dark'] as const
const SITE = 'https://bradthome.com'

const SENTENCE =
  'Led Android development across a suite of real-estate management apps, setting architecture and quality standards and coordinating delivery across mobile products.'
/** Brad's approved words for the tag row's claim, which the card doesn't show as a sentence. */
const STACK = 'Worked in Kotlin, Java and RxJava.'

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

const settle = (page: Page, wait = 120): Promise<unknown> =>
  page.evaluate(`new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, ${wait}))))`)

/** Scrolls at once so an element's top sits at a share of the screen's height (spec 028's way). */
async function bring(page: Page, selector: string, share: number, wait = 60): Promise<void> {
  await page.evaluate(
    `scrollTo({ top: Math.max(0, document.querySelector('${selector}').getBoundingClientRect().top + scrollY - innerHeight * ${share}), behavior: 'instant' })`,
  )
  await settle(page, wait)
}

/** The page's bottom margin, 40 CSS px, in points: the room under the last line is measured from it. */
const BOTTOM = 40 * 0.75

/** How far the last page's lowest line of text sits above the bottom margin, in points. */
async function roomUnderLastLine(bytes: Uint8Array): Promise<number> {
  const task = getDocument({ data: bytes, useSystemFonts: false })
  const document = await task.promise
  const page = await document.getPage(document.numPages)
  const content = await page.getTextContent()
  const lines = content.items
    .filter((item) => 'str' in item && item.str.trim() !== '')
    .map((item) => ('transform' in item ? (item.transform[5] as number) : 0))
    // The footer's words sit in the margin itself.
    .filter((y) => y > BOTTOM)
  await task.destroy()
  return Math.min(...lines) - BOTTOM
}

test.describe('the jobs read in date order, with RealPage as a card (story 1)', () => {
  test('S1.1 SC-001 FR-001 the home shows the featured card, RealPage, BookShout and Bottle Rocket, then the lines, at 375 and 1440 in both themes', async ({
    page,
  }) => {
    for (const viewport of [SMALL, WIDE]) {
      for (const theme of THEMES) {
        await enter(page, { viewport, theme })
        await open(page, '/')
        const order = (await page.evaluate(
          `[...document.querySelectorAll('#experience .experience__timeline, #experience article, #experience .experience__line')].map((el) => el.id || el.className.split(' ')[0])`,
        )) as string[]
        expect(order, `${viewport.width} ${theme}`).toEqual([
          'experience__timeline',
          'experience-bleacher-report',
          'experience-realpage',
          'experience-bookshout',
          'experience-bottle-rocket',
          'experience-enterprise-it',
          'experience-education',
        ])
        await expect(page.locator('#experience').getByRole('heading', { level: 3 })).toHaveText([
          'Bleacher Report · Senior Android Developer',
          'RealPage · Lead Android Developer',
          'BookShout · Senior Mobile Engineer',
          'Bottle Rocket · Android Developer',
        ])
        await expect(page.locator('#experience .experience__line dt')).toHaveText(['2008 – 2015', 'Education'])
      }
    }
  })

  test('S1.2 FR-002 RealPage’s card has its heading, kicker, sentence with its sparkle and anchor, and its tag list', async ({ page }) => {
    await enter(page, { viewport: WIDE, theme: 'light' })
    await open(page, '/')
    const card = page.locator('#experience-realpage')
    await expect(card).toHaveClass(/\bds-card\b/)
    await expect(card).not.toHaveClass(/ds-card--highlight/)
    await expect(card).toHaveAttribute('aria-labelledby', 'experience-realpage-heading')
    await expect(card.getByRole('heading', { level: 3 })).toHaveText('RealPage · Lead Android Developer')
    await expect(card.locator('.ds-card__kicker')).toHaveText('Real-estate apps · Apr 2018 – Sep 2019')
    const shown = await claimsIn(page, '#experience-realpage')
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatchObject({
      id: 'receipt-realpage-2',
      claim: 'realpage-2',
      text: SENTENCE,
      asks: 1,
      ends: true,
      href: '#contact',
      question: `Tell me more about this: “${SENTENCE}”`,
      name: 'Ask about this: Led Android across real-estate apps',
    })
    await expect(card.getByRole('list', { name: 'RealPage, tags' }).locator('li')).toHaveText(['Kotlin', 'Java', 'RxJava'])
    // No stats, no sources and no mark: RealPage's claims have no public link (D229, D235).
    await expect(card.locator('.ds-stats, .ds-sources, img')).toHaveCount(0)
  })

  test('S1.3 SC-001 FR-008 each role page shows the home’s Experience section, in the same order with the same words', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    const section = (): Promise<string[][]> =>
      page.evaluate(
        `[...document.querySelectorAll('#experience .experience__row, #experience article, #experience .experience__line')].map((el) => [el.id, el.innerText.replace(/\\s+/g, ' ').trim()])`,
      ) as Promise<string[][]>
    await open(page, '/')
    const home = await section()
    expect(home.length).toBe(6 + 4 + 2)
    for (const address of PAGES.slice(1)) {
      await open(page, address)
      expect(await section(), address).toEqual(home)
    }
  })

  test('S1.4 FR-003 the heading reads Brad’s words, and the eyebrow is unchanged', async ({ page }) => {
    await open(page, '/')
    await expect(page.locator('#experience-heading')).toHaveText(
      'Android for brands, a startup, real-estate apps and a sports media platform',
    )
    await expect(page.locator('#experience .ds-eyebrow')).toHaveText('Experience · Before Hopper')
  })

  test('S1.6 the timeline keeps its rows, dates and links, and RealPage’s bar takes the cards’ fill', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const rows = page.getByRole('list', { name: 'Timeline, newest first' }).locator(':scope > li')
    await expect(rows.locator('.experience__company')).toHaveText([
      'Hopper',
      'Bleacher Report',
      'RealPage',
      'BookShout',
      'Bottle Rocket',
      'Harley-Davidson and Infosys',
    ])
    await expect(rows.locator('.experience__dates')).toHaveText([
      'Apr 2022 – Oct 2026',
      'Sep 2019 – Apr 2022',
      'Apr 2018 – Sep 2019',
      'Nov 2017 – Mar 2018',
      'Oct 2015 – Nov 2017',
      'Nov 2008 – Oct 2015',
    ])
    const fills = (await page.evaluate(
      `Object.fromEntries([...document.querySelectorAll('#experience .experience__row')].map((row) => [row.querySelector('a').getAttribute('href'), getComputedStyle(row.querySelector('.experience__span')).fill]))`,
    )) as Record<string, string>
    expect(Object.keys(fills)).toEqual([
      '#hopper',
      '#experience-bleacher-report',
      '#experience-realpage',
      '#experience-bookshout',
      '#experience-bottle-rocket',
      '#experience-enterprise-it',
    ])
    expect(fills['#experience-realpage']).toBe(fills['#experience-bookshout'])
    expect(fills['#experience-realpage']).toBe(fills['#experience-bottle-rocket'])
    expect(fills['#experience-realpage']).not.toBe(fills['#experience-enterprise-it'])
    await expect(page.locator('#experience .experience__row--card')).toHaveCount(3)
    await expect(page.locator('#experience .experience__row--line')).toHaveCount(1)
  })

  test('S1.7 at 375 and 320 RealPage’s card stacks like the others, and nothing scrolls sideways', async ({ page }) => {
    for (const viewport of [SMALL, NARROW]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width}`).toBe(
        true,
      )
      const parts = (await page
        .locator('#experience-realpage')
        .evaluate((card) =>
          [...card.querySelectorAll('.ds-card__kicker, h3, .ds-claim, li')].map((part) => [
            part.getBoundingClientRect().top,
            part.getBoundingClientRect().right,
          ]),
        )) as [number, number][]
      expect(parts.length, `${viewport.width}`).toBe(6)
      const tops = parts.map(([top]) => top)
      expect(tops, `${viewport.width}`).toEqual([...tops].sort((a, b) => a - b))
      for (const [, right] of parts) expect(right, `${viewport.width}`).toBeLessThanOrEqual(viewport.width)
    }
  })
})

test.describe('every word is a public claim’s (story 2)', () => {
  test('S2.4 FR-002 no page shows realpage-3’s sentence or realpage-1’s old note, and the tags show realpage-3’s words', async ({
    page,
  }) => {
    for (const address of PAGES) {
      await open(page, address)
      const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
      expect(text.includes(STACK), address).toBe(false)
      expect(text.includes('The site shows only'), address).toBe(false)
      await expect(
        page.locator('[data-claim="realpage-3"], [data-claim="realpage-1"], #receipt-realpage-3, #receipt-realpage-1'),
        address,
      ).toHaveCount(0)
      await expect(page.locator('#experience-realpage li'), address).toHaveText(['Kotlin', 'Java', 'RxJava'])
    }
  })
})

test.describe('the PDFs print RealPage’s sentence in two pages (story 3)', () => {
  test('S3.1 S3.2 S3.3 SC-003 FR-005 each PDF is two pages, prints RealPage’s sentence under its heading, leaves realpage-3 out, and keeps room under its last line', async ({
    request,
  }) => {
    for (const role of ROLES) {
      const response = await request.get(`/resume/${FILES[role]}`)
      expect(response.status(), role).toBe(200)
      const bytes = new Uint8Array(await response.body())
      const pdf = await readPdf(bytes.slice())
      expect(pdf.pages, role).toBe(2)
      expect(pdf.smallest, role).toBeGreaterThanOrEqual(8.6)
      const text = compact(pdf.text.join(' ')).replace(/[•◦]/g, '')
      // S3.1: RealPage's heading and dates, then its one sentence, then BookShout's heading (D142's order).
      const heading = 'RealPage·LeadAndroidDeveloperApr2018–Sep2019'
      const from = text.indexOf(heading)
      const next = text.indexOf('BookShout·SeniorMobileEngineer')
      expect(from, role).toBeGreaterThan(text.indexOf('BleacherReport·SeniorAndroidDeveloper'))
      expect(next, role).toBeGreaterThan(from)
      expect(text.slice(from + heading.length, next), role).toBe(compact(SENTENCE))
      expect(text.includes(compact(STACK)), role).toBe(false)
      // S3.3: the enterprise IT years still print as a heading alone, then "On the side".
      expect(text, role).toContain('Harley-DavidsonandInfosys·EnterpriseIT2008–2015ONTHESIDE')
      // S3.2: on Brad's card the tightest PDF, mobile's, keeps 13 pt under its last line; each keeps at least 12.
      expect(await roomUnderLastLine(bytes.slice()), role).toBeGreaterThanOrEqual(12)
    }
  })
})

test.describe('the chat and its evals follow (story 4)', () => {
  test('S4.1 FR-006 the corpus and llms.txt send realpage-2 to its claim and the rest of RealPage to the card, and each link lands', async ({
    page,
  }) => {
    const corpus = JSON.parse(await (await page.request.get('/corpus.json')).text()) as {
      sources: { id: string; url: string; text: string }[]
    }
    const source = (id: string) => corpus.sources.find((entry) => entry.id === id)
    expect(source('realpage-2')?.url).toBe(`${SITE}/#receipt-realpage-2`)
    for (const id of ['realpage-1', 'realpage-3', 'job-realpage']) expect(source(id)?.url, id).toBe(`${SITE}/#experience-realpage`)
    expect(source('realpage-3')?.text).toBe(STACK)
    const llms = await (await page.request.get('/llms.txt')).text()
    expect(llms).toContain(`- [Résumé · RealPage](${SITE}/#receipt-realpage-2): ID \`realpage-2\`. ${SENTENCE}`)
    expect(llms).toContain(`- [Résumé · RealPage](${SITE}/#experience-realpage): ID \`realpage-3\`. ${STACK}`)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const [hash, target] of [
      ['#receipt-realpage-2', '#receipt-realpage-2'],
      ['#experience-realpage', '#experience-realpage'],
    ] as const) {
      await open(page, `/${hash}`)
      await expect(page.locator(target), hash).toBeInViewport()
      expect(await page.evaluate(`document.querySelector('${target}').matches(':target')`), hash).toBe(true)
    }
  })

  test('S4.2 a link to #experience-realpage, as the deployed chat sends today, lands on RealPage’s card below the header', async ({
    page,
  }) => {
    for (const viewport of [SMALL, WIDE]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/#experience-realpage')
      // Let the sticky header settle into its condensed state, as spec 027's deep links do.
      await settle(page, 350)
      const card = page.locator('#experience-realpage')
      await expect(card, `${viewport.width}`).toBeInViewport()
      expect(await card.evaluate((element) => element.matches(':target')), `${viewport.width}`).toBe(true)
      // Every in-page target lands 60 px down (spec 027's S8.6), and the card's title sits below the header.
      expect(Math.round((await card.boundingBox())?.y ?? -1), `${viewport.width}`).toBeGreaterThanOrEqual(60)
      const header = (await page.locator('.ds-header').boundingBox()) ?? { y: 0, height: 0 }
      const title = await card.getByRole('heading', { level: 3 }).boundingBox()
      expect(title?.y ?? -1, `${viewport.width}`).toBeGreaterThanOrEqual(header.y + header.height)
    }
  })
})

test.describe('everything else holds (story 5)', () => {
  test('S5.1 SC-004 FR-008 the page loads only the one module, main’s 13,010 bytes', async ({ page }) => {
    await open(page, '/')
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    // This slice adds no script, so the module is main's, as spec 039 measured it.
    expect((await (await page.request.get(src)).body()).length).toBe(13_010)
  })

  test('S5.3 FR-008 with motion allowed RealPage’s card reveals once, like the cards around it', async ({ page }) => {
    await enter(page, { viewport: WIDE, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await settle(page)
    await expect(page.locator('#experience-realpage')).toHaveAttribute('data-reveal', 'card')
    await bring(page, '#experience-realpage', 0.5)
    const rises = (await page.evaluate(
      `document.querySelector('#experience-realpage').getAnimations().filter((a) => a.animationName === 'ds-rv-rise').map((a) => Math.round(Number(a.effect.getTiming().duration)))`,
    )) as number[]
    expect(rises).toEqual([560])
    expect(await page.evaluate(`document.querySelector('#experience-realpage').dataset.rv`)).toBe('go')
    await page.waitForTimeout(1200)
    // Once played, it's forgotten: going up and back replays nothing.
    await bring(page, '#hopper', 0.1)
    await bring(page, '#experience-realpage', 0.5, 300)
    expect(
      await page.evaluate(
        `document.querySelector('#experience-realpage').getAnimations().filter((a) => String(a.animationName).startsWith('ds-rv')).length`,
      ),
    ).toBe(0)
  })

  test('S5.3 FR-008 with reduced motion RealPage’s card is at rest and never posed', async ({ page }) => {
    await enter(page, { viewport: WIDE, theme: 'light' })
    await open(page, '/')
    await bring(page, '#experience-realpage', 0.5, 300)
    const card = page.locator('#experience-realpage')
    expect(
      await card.evaluate((element) => [
        element.getAttribute('data-rv'),
        element.getAnimations().length,
        element.ownerDocument.defaultView?.getComputedStyle(element).translate,
      ]),
    ).toEqual([null, 0, 'none'])
  })

  test.describe('with no script', () => {
    test.use({ javaScriptEnabled: false })

    test('S5.3 FR-008 RealPage’s card shows at rest, in its place', async ({ page }) => {
      await page.goto('/')
      const card = page.locator('#experience-realpage')
      await expect(card).toBeVisible()
      expect(
        await card.evaluate((element) => {
          const style = element.ownerDocument.defaultView?.getComputedStyle(element)
          return [element.getAttribute('data-rv'), style?.opacity, style?.translate]
        }),
      ).toEqual([null, '1', 'none'])
      await expect(card.locator('.ds-claim-ask')).toHaveAttribute('href', '#contact')
    })
  })

  test('S5.4 SC-004 FR-008 layout shift stays 0 as the home loads and scrolls to its end, with motion allowed', async ({ page }) => {
    await watchShifts(page)
    await enter(page, { viewport: SMALL, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const height = (await page.evaluate('document.documentElement.scrollHeight')) as number
    for (let y = 0; y < height; y += 600) {
      await page.evaluate(`window.scrollTo(0, ${y})`)
      await page.waitForTimeout(120)
    }
    await page.waitForTimeout(800)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })

  test('S5.5 FR-008 Bleacher Report’s mark is the section’s one picture, on its own card', async ({ page }) => {
    for (const address of PAGES) {
      await open(page, address)
      await expect(page.locator('#experience img'), address).toHaveCount(1)
      await expect(page.locator('#experience-bleacher-report img[src="/marks/bleacher-report.svg"]'), address).toHaveCount(1)
    }
  })
})
