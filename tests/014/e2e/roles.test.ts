import { expect, type Page, test } from '@playwright/test'
import { focused, RGB } from '../../009/helpers/e2e.ts'
import { contrast, DESKTOP, enter, HOME, NARROW, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 014's role pages in the browser: each page's order, eyebrow and
// highlight, its claims against the home's, the "Hiring for" switch, the keyboard,
// the metadata, contrast and layout shift. Playwright's config asks for
// reduced motion by default, so the hero shows at rest.

const ROLES = [
  {
    path: '/mobile',
    word: 'Mobile',
    eyebrow: 'Senior mobile engineer · Dallas–Fort Worth',
    title: 'Brad Thome · Mobile engineer',
    note: 'Lit for mobile',
    resume: '/resume/brad-thome-mobile.pdf',
    rows: ['Android', 'iOS'],
    topics: ['RemoteUI and WebViews', 'Capital One Travel: Disruption Assistance', 'The partner platform', 'Fintech AI', 'Human-approved agent workflow'],
  },
  {
    path: '/fullstack',
    word: 'Full-stack',
    eyebrow: 'Senior full-stack engineer · Dallas–Fort Worth',
    title: 'Brad Thome · Full-stack engineer',
    note: 'Lit for full-stack',
    resume: '/resume/brad-thome-full-stack.pdf',
    rows: ['Web', 'Services'],
    topics: ['Capital One Travel: Disruption Assistance', 'The partner platform', 'RemoteUI and WebViews', 'Human-approved agent workflow', 'Fintech AI'],
  },
  {
    path: '/ai',
    word: 'Applied AI',
    eyebrow: 'Senior engineer · Applied AI · Dallas–Fort Worth',
    title: 'Brad Thome · Applied AI',
    note: 'Lit for applied AI',
    resume: '/resume/brad-thome-applied-ai.pdf',
    rows: ['AI'],
    topics: ['Fintech AI', 'Human-approved agent workflow', 'The partner platform', 'Capital One Travel: Disruption Assistance', 'RemoteUI and WebViews'],
  },
] as const
const HOME_TOPICS = ['Capital One Travel: Disruption Assistance', 'The partner platform', 'Fintech AI', 'Human-approved agent workflow', 'RemoteUI and WebViews']
// Spec 025 (D206) made the switch "Tailor this page"; since spec 036 (D223) the hero's role tiles are the switch.
const SWITCH = [
  ['Mobile', '/mobile'],
  ['Full-stack', '/fullstack'],
  ['Applied AI', '/ai'],
] as const

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** A claim as the page shows it: its words, the anchor it carries, and its sparkles' names and questions. */
interface Shown {
  id: string
  text: string
  anchor: string
  asks: { name: string; question: string }[]
  /** Whether nothing but white space follows the claim's last sparkle, so the sparkle ends the claim. */
  ends: boolean
}

// Amended by spec 038 (D229, D230): a claim has no marker now. Its sparkle holds no words, so a claim's text is its
// whole text, and the sparkle's name and question are read beside it.
/** Every claim on the page, in reading order. */
const claims = (page: Page): Promise<Shown[]> =>
  page.locator('main [data-claim]').evaluateAll((all) =>
    all.map((claim) => {
      const asks = [...claim.querySelectorAll('.ds-claim-ask')]
      const last = asks.at(-1)
      const after = claim.ownerDocument.createRange()
      if (last !== undefined) after.setStartAfter(last)
      after.setEnd(claim, claim.childNodes.length)
      return {
        id: claim.getAttribute('data-claim') ?? '',
        text: (claim.textContent ?? '').replace(/\s+/g, ' ').trim(),
        anchor: claim.id,
        asks: asks.map((ask) => ({ name: ask.getAttribute('aria-label') ?? '', question: ask.getAttribute('data-chat-ask') ?? '' })),
        ends: last !== undefined && after.toString().trim() === '',
      }
    }),
  ) as Promise<Shown[]>

/** Every element on the page whose id is a claim's anchor, in order. */
const anchors = (page: Page): Promise<string[]> => page.locator('[id^="receipt-"]').evaluateAll((all) => all.map((element) => element.id))

/**
 * The words a sparkle's question quotes, or a claim's text, less white space and semicolons: a question joins a
 * list's items with "; " where the page shows them as list items, so this compares the words alone.
 */
const squeezed = (text: string): string => text.replace(/[\s;]/g, '')
const QUESTION = /^Tell me more about this: “([\s\S]+)”$/

const sectionOrder = (page: Page): Promise<string[]> =>
  page.evaluate(
    `[...document.querySelectorAll('body > header, body > .home-roles, main > section')].map((e) => e.id || (e.classList.contains('home-roles') ? 'switch' : e.classList.contains('hero') ? 'hero' : e.tagName.toLowerCase()))`,
  ) as Promise<string[]>

const topicTitles = (page: Page): Promise<string[]> => page.locator('#hopper .hopper__topic h3').allTextContents().then((all) => all.map((t) => t.trim()))

const wordColors = (page: Page): Promise<string[]> =>
  page.evaluate(`[...document.querySelectorAll('.hero__word')].map((word) => getComputedStyle(word).color)`) as Promise<string[]>

test.describe('each role page', () => {
  test('S1.1 S1.5 FR-001 each role page reads header, hero, Hopper, Experience, On the side and Contact (specs 017 and 025), as the home does', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, HOME)
    const home = await sectionOrder(page)
    expect(home).toEqual(['header', 'hero', 'hopper', 'experience', 'side', 'contact'])
    const experience = await page.locator('#experience [data-claim], #experience .experience__line').allTextContents()
    const side = await page.locator('#side article').evaluateAll((cards) => cards.map((card) => card.id))
    for (const role of ROLES) {
      await open(page, role.path)
      expect(await sectionOrder(page), role.path).toEqual(home)
      expect(await page.locator('#experience [data-claim], #experience .experience__line').allTextContents(), role.path).toEqual(experience)
      expect(await page.locator('#side article').evaluateAll((cards) => cards.map((card) => card.id)), role.path).toEqual(side)
    }
  })

  test('S1.2 FR-002 each eyebrow names its role, and the home keeps every role', async ({ page }) => {
    await open(page, HOME)
    await expect(page.locator('.hero .ds-eyebrow')).toHaveText('Senior mobile & full-stack engineer · Dallas–Fort Worth')
    for (const role of ROLES) {
      await open(page, role.path)
      await expect(page.locator('.hero .ds-eyebrow'), role.path).toHaveText(role.eyebrow)
    }
  })

  test("S1.3 FR-003 each page's Hopper topics follow D134's order after the role lines, the first one highlighted", async ({ page }) => {
    await open(page, HOME)
    expect(await topicTitles(page)).toEqual(HOME_TOPICS)
    for (const role of ROLES) {
      await open(page, role.path)
      expect(await topicTitles(page), role.path).toEqual(role.topics)
      await expect(page.locator('#hopper .hopper__topic').first(), role.path).toHaveClass(/ds-card--highlight/)
      await expect(page.locator('#hopper .hopper__topic.ds-card--highlight'), role.path).toHaveCount(1)
      expect(
        await page.evaluate(`document.querySelector('.hopper__role').compareDocumentPosition(document.querySelector('.hopper__topics')) & 4`),
      ).toBe(4)
    }
  })

  test("S1.4 FR-002 the role's word is the accent and the others dim, its rows lit, and the note names it; the home lights nothing", async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await open(page, HOME)
      expect(await wordColors(page)).toEqual([RGB[theme].ink, RGB[theme].ink, RGB[theme].ink])
      await expect(page.locator('.hero__row--lit')).toHaveCount(0)
      await expect(page.locator('.hero__stack-note')).toHaveText('Where I work')
      const dim = theme === 'light' ? 'rgb(133, 139, 150)' : 'rgb(110, 117, 129)'
      for (const role of ROLES) {
        await open(page, role.path)
        const words = await page.locator('.hero__word').evaluateAll((all) => all.map((w) => w.firstChild?.textContent?.trim()))
        expect(await wordColors(page), `${theme} ${role.path}`).toEqual(words.map((word) => (word === role.word ? RGB[theme].accent : dim)))
        const dots = (await page.evaluate(`[...document.querySelectorAll('.hero__dot')].map((dot) => getComputedStyle(dot).color)`)) as string[]
        expect(dots, `${theme} ${role.path}`).toEqual(words.map((word) => (word === role.word ? RGB[theme].accent : dim)))
        expect(await page.locator('.hero__row--lit .hero__layer').allTextContents(), `${theme} ${role.path}`).toEqual([...role.rows])
        const lit = page.locator('.hero__row--lit').first()
        await expect(lit).toHaveCSS('border-top-color', RGB[theme].accent)
        await expect(lit.locator('.hero__layer')).toHaveCSS('color', RGB[theme].accent)
        await expect(page.locator('.hero__stack-note'), role.path).toHaveText(role.note)
      }
    }
  })

  test('S1.6 on a phone, and at 320, each role page keeps its order, the switch stays on screen, and nothing scrolls sideways', async ({ page }) => {
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'dark' })
      for (const role of ROLES) {
        await open(page, role.path)
        expect(await page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), `${viewport.width} ${role.path}`).toBe(true)
        expect(await sectionOrder(page)).toEqual(['header', 'hero', 'hopper', 'experience', 'side', 'contact'])
        expect(await topicTitles(page)).toEqual(role.topics)
        // Spec 027's T5 kept the switch on screen (D209); since spec 036 the switch is the tiles, which stack on a phone (D223).
        const right = (await page.evaluate(`document.querySelector('.hero__roles').getBoundingClientRect().right`)) as number
        expect(right).toBeLessThanOrEqual(viewport.width)
      }
    }
  })
})

test.describe('the same words and facts', () => {
  // Amended by spec 038 (D229, D230): the numbered markers are gone. Each claim on a card carries the anchor its
  // receipt had, once on the page, and ends with one sparkle whose question quotes it; a role page shows each with the
  // same anchor, name and question as the home. The education line, which no card holds, has neither.
  test("S2.1 SC-002 FR-004 each role page shows exactly the home's claims with the same text, each with its anchor and one sparkle at its end", async ({
    page,
  }) => {
    await open(page, HOME)
    const home = await claims(page)
    expect(home.length).toBeGreaterThan(20)
    const cards = home.filter((claim) => claim.anchor !== '')
    expect(home.filter((claim) => claim.anchor === '').map((claim) => [claim.id, claim.asks.length])).toEqual([['education-1', 0]])
    expect(cards.map((claim) => claim.anchor)).toEqual(cards.map((claim) => `receipt-${claim.id}`))
    expect(await anchors(page)).toEqual(cards.map((claim) => claim.anchor))
    for (const claim of cards) {
      expect(claim.asks, claim.id).toHaveLength(1)
      expect(claim.ends, claim.id).toBe(true)
      const [ask] = claim.asks
      expect(ask?.name, claim.id).toMatch(/^Ask about this: \S/)
      expect(ask?.question, claim.id).toMatch(QUESTION)
      expect(squeezed(QUESTION.exec(ask?.question ?? '')?.[1] ?? ''), claim.id).toBe(squeezed(claim.text))
    }
    const sparkles = (list: Shown[]) =>
      new Map(list.map((claim) => [claim.id, { anchor: claim.anchor, asks: claim.asks, ends: claim.ends }]))
    for (const role of ROLES) {
      await open(page, role.path)
      const shown = await claims(page)
      expect(new Map(shown.map((claim) => [claim.id, claim.text])), role.path).toEqual(new Map(home.map((claim) => [claim.id, claim.text])))
      expect(shown.length, role.path).toBe(home.length)
      expect(sparkles(shown), role.path).toEqual(sparkles(home))
      expect(await anchors(page), role.path).toEqual(shown.filter((claim) => claim.anchor !== '').map((claim) => claim.anchor))
    }
  })

  test('S2.2 FR-004 Hopper is the first section after the hero, and VINDecoded is in no level-1 or level-2 heading or eyebrow', async ({ page }) => {
    for (const role of ROLES) {
      await open(page, role.path)
      expect(await page.evaluate(`document.querySelector('main > .hero').nextElementSibling.id`), role.path).toBe('hopper')
      for (const text of await page.locator('h1, h2, .ds-eyebrow').allTextContents()) expect(text, role.path).not.toMatch(/VINDecoded/i)
    }
  })

  // Amended by spec 036 (D223, D225): a role page also opens its tile's detail, links "Show all roles" and names its role
  // on the work and résumé buttons, so those parts are left out of the comparison and checked on their own. The picked
  // tile has no "Tailor the page" hint, nor the space before it, so the words are compared without their spaces.
  test("S2.3 D141 the hero reads as on the home but for the eyebrow and note, and the résumé link opens each page's PDF", async ({ page }) => {
    const hero = (p: Page) =>
      p.evaluate(
        `(() => { const h = document.querySelector('.hero').cloneNode(true); for (const part of h.querySelectorAll('.ds-eyebrow, .hero__stack-note, .hero__ask-row, .hero__detail, .hero__tile-go, .hero__actions')) part.remove(); return h.textContent.replace(/\\s+/g, '') })()`,
      ) as Promise<string>
    await open(page, HOME)
    const home = await hero(page)
    for (const role of ROLES) {
      await open(page, role.path)
      expect(await hero(page), role.path).toBe(home)
      await expect(page.locator('.hero__actions').getByRole('link', { name: /résumé PDF$/ }), role.path).toHaveAttribute('href', role.resume)
      await expect(page.locator('.hero__actions').getByRole('link', { name: /^See the .+ work at Hopper$/ }), role.path).toHaveAttribute('href', '#hopper')
    }
  })
})

test.describe('the switch', () => {
  // Amended by spec 036 (D223): the switch is the hero's three role tiles, under "What are you hiring for?".
  test('S3.1 FR-005 every page lists the three role pages in the hero and marks its own, with no address (spec 036)', async ({ page }) => {
    for (const [current, href] of [['', '/'], ...SWITCH] as const) {
      await open(page, href)
      const nav = page.getByRole('navigation', { name: 'What are you hiring for?' })
      await expect(nav.locator('.hero__tile-name')).toHaveText(SWITCH.map(([label]) => label))
      expect(await nav.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(SWITCH.map(([, h]) => h))
      expect(await nav.locator('[aria-current="page"] .hero__tile-name').allTextContents()).toEqual(current ? [current] : [])
      await expect(nav.locator('.ds-roles__url')).toHaveCount(0)
      if (current) await expect(nav.locator('[aria-current="page"]')).toHaveCSS('border-top-color', RGB.light.accent)
    }
  })

  test('S3.2 FR-005 following "Applied AI" from the home loads /ai, and back returns to the home, with no script but the previews script on either', async ({ page }) => {
    await open(page, HOME)
    expect(await onlyPreviewScript(page)).toBe(true)
    await page.getByRole('navigation', { name: 'What are you hiring for?' }).getByRole('link', { name: /^Applied AI/ }).click()
    await expect(page).toHaveURL(/\/ai$/)
    await expect(page.locator('.hero .ds-eyebrow')).toHaveText(ROLES[2].eyebrow)
    expect(await topicTitles(page)).toEqual(ROLES[2].topics)
    expect(await onlyPreviewScript(page)).toBe(true)
    await page.goBack()
    await expect(page).toHaveURL((url) => url.pathname === '/')
    await expect(page.locator('.hero .ds-eyebrow')).toHaveText('Senior mobile & full-stack engineer · Dallas–Fort Worth')
  })

  // Amended by spec 036 (D223): the switch is the tiles, led on a role page by "Show all roles".
  test('S3.3 FR-008 F1 Tab moves from "Show all roles" through the switch (spec 036), each link 44 pixels tall with a 2-pixel accent ring', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      await open(page, '/mobile')
      // On a role page "Show all roles" leads the switch, beside its question; the tiles follow it.
      await page.getByRole('link', { name: 'Show all roles' }).focus()
      for (const label of ['Mobile', 'Full-stack', 'Applied AI']) {
        await page.keyboard.press('Tab')
        const now = await focused(page)
        expect(now?.label, `${theme} ${label}`).toMatch(new RegExp(`^${label} `))
        expect(now?.outline, `${theme} ${label}`).toBe('solid')
        expect(now?.width ?? 0, `${theme} ${label}`).toBeGreaterThanOrEqual(2)
        expect(now?.color, `${theme} ${label}`).toBe(RGB[theme].accent)
        expect(contrast(now?.color ?? '', RGB[theme].bg), `${theme} ${label}`).toBeGreaterThanOrEqual(3)
      }
      for (const height of await page.locator('.hero__tile').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height)))
        expect(height).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('one indexable page', () => {
  test('S4.1 FR-006 each role page has its title, noindex and a canonical link to itself', async ({ page }) => {
    for (const role of ROLES) {
      await open(page, role.path)
      await expect(page).toHaveTitle(role.title)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://bradthome.com${role.path}`)
    }
  })

  test("S4.2 FR-006 the home keeps its title, has no robots tag, and its canonical link is the home; every page keeps the home's description", async ({ page }) => {
    await open(page, HOME)
    await expect(page).toHaveTitle('Brad Thome')
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://bradthome.com/')
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    for (const role of ROLES) {
      await open(page, role.path)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description ?? '')
    }
  })
})

test.describe('for everyone', () => {
  test("S5.2 FR-008 the dim words meet 3:1, the accent word 3:1, and every lit row's text 4.5:1, in both themes", async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await enter(page, { viewport: DESKTOP, theme })
      for (const role of ROLES) {
        await open(page, role.path)
        const bg = RGB[theme].bg
        for (const color of await wordColors(page)) expect(contrast(color, bg), `${theme} ${role.path} ${color}`).toBeGreaterThanOrEqual(3)
        const pairs = (await page.evaluate(
          `[...document.querySelectorAll('.hero__row--lit')].flatMap((row) => { const fill = getComputedStyle(row).backgroundColor; return [...row.querySelectorAll('.hero__layer, .hero__tech, .hero__where')].map((t) => [t.className, getComputedStyle(t).color, fill]) })`,
        )) as [string, string, string][]
        expect(pairs.length).toBeGreaterThan(0)
        for (const [name, color, fill] of pairs) expect(contrast(color, fill), `${theme} ${role.path} ${name}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  test('S5.3 SC-004 FR-009 each role page shifts nothing as it loads, with the sequence playing, at both sizes', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      for (const role of ROLES) {
        await page.goto('about:blank')
        await enter(page, { viewport, theme: 'light' }, 'no-preference')
        await page.addInitScript(
          `window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__shift += entry.value }).observe({ type: 'layout-shift', buffered: true })`,
        )
        await page.goto(role.path)
        await page.waitForTimeout(3000)
        expect(await page.evaluate('window.__shift'), `${viewport.width} ${role.path}`).toBe(0)
        expect(await page.locator('main [style]').count()).toBe(0)
      }
    }
  })
})

test.describe('the essay and 404 page stay v1 (spec 019)', () => {
  test("S6.1 no v1 page links a role page, and v1's pages still load only v1's stylesheet", async ({ page }) => {
    for (const path of ['/vindecoded-agents', '/404']) {
      await page.goto(path)
      for (const role of ROLES) expect(await page.locator(`a[href="${role.path}"], a[href$="${role.path}.html"]`).count(), `${path} ${role.path}`).toBe(0)
      const sheets = (await page.evaluate(`[...document.querySelectorAll('link[rel=stylesheet]')].map((l) => new URL(l.href).pathname)`)) as string[]
      expect(sheets.every((sheet) => sheet.startsWith('/_astro/Base.')), path).toBe(true)
    }
  })
})
