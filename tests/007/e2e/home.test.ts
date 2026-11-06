import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { type ConfigData, HtmlValidate } from 'html-validate'
import { enter, fontsSettled, MISSING, STATES } from '../../003/helpers/e2e.ts'
import { COLORS, rgb } from '../../003/helpers/site.ts'
import { articleText, FILES as ESSAY_FILES, ESSAY } from '../../006/helpers/essay.ts'
import { CHROME, FILES, firstDifference, OUTSIDE_LINKS, PAGES, repoPath } from '../helpers/home.ts'

// The shared header and footer in a real browser, served as Hosting serves
// it (spec 007, E1–E6, N1, N2). v1's home and its checks retired with v2.0
// (D162); the essay and the 404 page keep v1's layout. Computed
// styles are read with string expressions, since the repo's type check has
// no DOM types.

const computed = (selector: string, property: string): string =>
  `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).getPropertyValue(${JSON.stringify(property)})`

const RULE = { light: '#e2dfd8', dark: '#2e3135' } as const

test('S1.4 FR-005 SC-004 every link to another host on every page is one of the four allowed addresses', async ({ page }) => {
  for (const { path, name } of PAGES) {
    await page.goto(path)
    const hrefs = (await page.evaluate('[...document.querySelectorAll("a[href]")].map((el) => el.getAttribute("href"))')) as string[]
    const origin = new URL(page.url()).origin
    for (const href of hrefs.filter((value) => /^https?:\/\//.test(value) && new URL(value).origin !== origin)) {
      expect(OUTSIDE_LINKS as readonly string[], `${name}: ${href}`).toContain(href)
    }
  }
})

test('S2.1 S2.2 FR-001 H1 E1 E5 N1 every page has the header with the name and the Elsewhere links, and the footer', async ({ page }) => {
  for (const { path, name } of PAGES) {
    await page.goto(path)
    const header = page.locator('body > header.site-header')
    await expect(header, name).toHaveCount(1)
    const home = header.getByRole('link', { name: CHROME.name, exact: true })
    await expect(home, name).toHaveAttribute('href', '/')
    const nav = page.getByRole('navigation', { name: 'Elsewhere' })
    await expect(nav.getByRole('link'), name).toHaveText(['GitHub', 'LinkedIn'])
    await expect(nav.getByRole('link', { name: 'GitHub' }), name).toHaveAttribute('href', CHROME.github)
    await expect(nav.getByRole('link', { name: 'LinkedIn' }), name).toHaveAttribute('href', CHROME.linkedin)
    const footer = page.locator('body > footer.site-footer')
    await expect(footer, name).toHaveText(CHROME.footer)
    await expect(footer.getByRole('link'), name).toHaveAttribute('href', '/')
    await expect(page.locator('body > main'), name).toHaveCount(1)
  }
})

test("S2.3 FR-007 E1 E2 E3 E4 the essay's article text and head are unchanged", async ({ page, request }) => {
  const expected = readFileSync(ESSAY_FILES.article, 'utf8').trim()
  const actual = articleText(await (await request.get('/vindecoded-agents')).text())
  expect(actual === expected, firstDifference(actual, expected)).toBe(true)
  await page.goto('/vindecoded-agents')
  await expect(page).toHaveTitle(`${ESSAY.title} · Brad Thome`)
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', ESSAY.title)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', ESSAY.canonical)
})

test('S2.4 N1 N2 a missing path answers 404 with its words, the header and the footer, and no link-preview tags', async ({ page }) => {
  const response = await page.goto('/no-such-page')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
  await expect(page.getByText("There's no page at this address.", { exact: true })).toBeVisible()
  await expect(page.locator('main').getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
  await expect(page.locator('header.site-header')).toHaveCount(1)
  await expect(page.locator('footer.site-footer')).toHaveText(CHROME.footer)
  await expect(page.locator('meta[property^="og:"], meta[name="author"], link[rel="canonical"], meta[name^="twitter:"]')).toHaveCount(0)
})

test("S2.5 at 390 and 320 pixels every page's header fits on one row, and no page scrolls sideways", async ({ page }) => {
  for (const width of [390, 320]) {
    for (const { path, name } of PAGES) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(path)
      await fontsSettled(page)
      expect(await page.evaluate('document.documentElement.scrollWidth'), `${name} ${width}px`).toBe(width)
      const [name0 = 0, nav = 0, height = 0] = (await page.evaluate(
        '[document.querySelector(".site-header .name").getBoundingClientRect().top, document.querySelector(".site-header nav").getBoundingClientRect().top, document.querySelector(".site-header nav").getBoundingClientRect().height]',
      )) as number[]
      expect(Math.abs(name0 - nav), `${name} ${width}px: the links sit beside the name`).toBeLessThan(height)
    }
  }
})

test("S3.2 E1 E2 E3 E4 the header and footer use each theme's colors", async ({ page }) => {
  for (const state of STATES) {
    await enter(page, state)
    await page.goto('/vindecoded-agents')
    const colors = COLORS[state.theme]
    expect(await page.evaluate(computed('.site-header .name', 'color')), state.label).toBe(rgb(colors.text))
    expect(await page.evaluate(computed('.site-header nav a', 'color')), state.label).toBe(rgb(colors.quiet))
    expect(await page.evaluate(computed('.site-footer', 'color')), state.label).toBe(rgb(colors.quiet))
    expect(await page.evaluate(computed('.site-footer', 'border-top-color')), state.label).toBe(rgb(RULE[state.theme]))
  }
})

test('S3.3 FR-006 nothing moves: no animation or transition', async ({ page }) => {
  for (const { path, name } of PAGES) {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
    await page.goto(path)
    expect(await page.evaluate('document.getAnimations().length'), name).toBe(0)
    const moving = (await page.evaluate(
      '[...document.querySelectorAll("body *")].filter((el) => getComputedStyle(el).transitionDuration.split(",").some((d) => Number.parseFloat(d) > 0)).length',
    )) as number
    expect(moving, name).toBe(0)
  }
})

test('S4.4 FR-010 no page requests another host, runs a script, carries an inline style or logs an error', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin
  const requests: string[] = []
  const errors: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  // The 404 page's own document answers 404, and the browser logs it. That
  // one log is expected; any other failed response or error isn't.
  const missing = (url: string): boolean => new URL(url).pathname === MISSING
  page.on('response', (response) => {
    if (response.status() >= 400 && !(missing(response.url()) && response.request().resourceType() === 'document')) {
      errors.push(`${response.status()} ${response.url()}`)
    }
  })
  page.on('console', (message) => {
    const expected = /the server responded with a status of 404/.test(message.text()) && missing(message.location().url || page.url())
    if ((message.type() === 'error' && !expected) || message.type() === 'warning') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  for (const { path, name } of PAGES) {
    for (const state of STATES) {
      await enter(page, state)
      await page.goto(path)
      await fontsSettled(page)
      expect(await page.locator('script').count(), `${name} ${state.label}`).toBe(0)
      expect(await page.locator('[style]').count(), `${name} ${state.label}`).toBe(0)
    }
  }
  for (const url of requests) expect(new URL(url).origin, url).toBe(origin)
  expect(errors).toEqual([])
})

test("S4.5 the served pages pass html-validate with the repo's config, and their internal links resolve", async ({ page, request }) => {
  const config = JSON.parse(readFileSync(repoPath('.htmlvalidate.json'), 'utf8')) as ConfigData
  for (const { path, name } of PAGES) {
    const html = await (await request.get(path)).text()
    const report = await new HtmlValidate(config).validateString(html, `${name}.html`)
    const messages = report.results.flatMap((result) =>
      result.messages.map((message) => `${name} ${message.line}:${message.column} ${message.ruleId} ${message.message}`),
    )
    expect(messages).toEqual([])
    await page.goto(path)
    const hrefs = (await page.evaluate(
      '[...document.querySelectorAll("a[href], link[href]")].map((el) => el.getAttribute("href"))',
    )) as string[]
    for (const href of hrefs.filter((value) => value.startsWith('/')))
      expect((await request.get(href)).status(), `${name}: ${href}`).toBe(200)
  }
})
