import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { type ConfigData, HtmlValidate } from 'html-validate'
import { enter, fontsSettled, STATES } from '../../003/helpers/e2e.ts'
import { COLORS, rgb } from '../../003/helpers/site.ts'
import { articleText, ESSAY, FILES, firstDifference, PATH, repoPath } from '../helpers/essay.ts'

// The essay in a real browser, served as Hosting serves it (spec 006,
// E1–E8). Computed styles are read with string expressions, since the repo's
// type check has no DOM types.

const computed = (selector: string, property: string): string =>
  `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).getPropertyValue(${JSON.stringify(property)})`

const SCROLLER = 'document.querySelector(".system-diagram .scroller")'

const [PHONE, , DESKTOP] = STATES

test('S1.1 FR-001 the essay answers 200 at /vindecoded-agents, and the .html and trailing-slash addresses redirect to it', async ({ request }) => {
  const page = await request.get(PATH, { maxRedirects: 0 })
  expect(page.status()).toBe(200)
  for (const other of [`${PATH}.html`, `${PATH}/`]) {
    const response = await request.get(other, { maxRedirects: 0 })
    expect(response.status(), other).toBe(301)
    expect(new URL(response.headers().location ?? '', 'http://x').pathname, other).toBe(PATH)
  }
})

test("S1.2 FR-002 SC-001 the article's text equals today's page's, word for word, the diagram's words included", async ({ request }) => {
  const expected = readFileSync(FILES.article, 'utf8').trim()
  const actual = articleText(await (await request.get(PATH)).text())
  expect(actual === expected, firstDifference(actual, expected)).toBe(true)
})

test('S1.3 FR-003 the head keeps today\'s title, description, author, canonical and link-preview tags, with lang="en"', async ({ page }) => {
  await page.goto(PATH)
  await expect(page).toHaveTitle(`${ESSAY.title} · Brad Thome`)
  const tags: [string, string, string][] = [
    ['meta[name="description"]', 'content', ESSAY.description],
    ['meta[name="author"]', 'content', 'Brad Thome'],
    ['link[rel="canonical"]', 'href', ESSAY.canonical],
    ['meta[property="og:type"]', 'content', 'article'],
    ['meta[property="og:site_name"]', 'content', 'Brad Thome'],
    ['meta[property="og:title"]', 'content', ESSAY.title],
    ['meta[property="og:description"]', 'content', ESSAY.description],
    ['meta[property="og:url"]', 'content', ESSAY.canonical],
    ['meta[name="twitter:card"]', 'content', 'summary'],
  ]
  for (const [selector, attribute, value] of tags) await expect(page.locator(selector), selector).toHaveAttribute(attribute, value)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('S1.4 FR-003 FR-004 E1 E3 the heading, the byline with its date, and the header\'s "Brad Thome" link to the home page', async ({ page }) => {
  for (const state of [PHONE, DESKTOP]) {
    if (state === undefined) continue
    await enter(page, state)
    await page.goto(PATH)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(ESSAY.title.replaceAll('-', '‑'))
    await expect(page.locator('.byline')).toHaveText(ESSAY.byline)
    await expect(page.locator('.byline time')).toHaveAttribute('datetime', ESSAY.date)
    // The header is spec 007's, and its first link is "Brad Thome", home.
    const first = page.getByRole('banner').getByRole('link').first()
    await expect(first).toHaveText('Brad Thome')
    await expect(first).toHaveAttribute('href', '/')
    await expect(page.locator('article').getByRole('link', { name: 'Brad Thome' })).toHaveCount(0)
  }
})

test('S2.1 FR-005 the diagram is one named image with six phases, five highlighted steps and its caption', async ({ page }) => {
  await page.goto(PATH)
  const image = page.getByRole('img')
  await expect(image).toHaveCount(1)
  await expect(image).toHaveAccessibleName(/^How a change moves from a request to customers and back/)
  const svg = page.locator('.system-diagram svg')
  await expect(svg.locator('rect.phase')).toHaveCount(6)
  await expect(svg.locator('rect.chip.mine:not([width="12"])')).toHaveCount(5)
  await expect(page.locator('.system-diagram figcaption')).toHaveText(/6 phases, 5 points where I step in$/)
})

test("S2.2 FR-006 E6 on a phone the diagram keeps its width and scrolls in its frame, and the page doesn't scroll sideways", async ({ page }) => {
  if (PHONE === undefined) return
  await enter(page, PHONE)
  await page.goto(PATH)
  await fontsSettled(page)
  const [scroll = 0, client = 0] = (await page.evaluate(`[${SCROLLER}.scrollWidth, ${SCROLLER}.clientWidth]`)) as number[]
  expect(scroll).toBeGreaterThanOrEqual(600)
  expect(scroll).toBeGreaterThan(client)
  expect(await page.evaluate('document.documentElement.scrollWidth')).toBe(PHONE.viewport.width)
})

test("S2.3 FR-006 E6 the diagram's frame takes focus from the keyboard, with a visible ring, and the arrow keys scroll it", async ({ page }) => {
  if (PHONE === undefined) return
  await enter(page, PHONE)
  await page.goto(PATH)
  const frame = page.locator('.system-diagram .scroller')
  await expect(page.getByRole('region', { name: /^How a change moves/ })).toHaveCount(1)
  await expect(frame).toHaveAccessibleName(/^How a change moves/)
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(`document.activeElement === ${SCROLLER}`)) break
  }
  await expect(frame).toBeFocused()
  expect(await page.evaluate(computed(':focus', 'outline-style'))).not.toBe('none')
  expect(Number.parseFloat(await page.evaluate(computed(':focus', 'outline-width')))).toBeGreaterThan(0)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => page.evaluate(`${SCROLLER}.scrollLeft`)).toBeGreaterThan(0)
})

test("S2.4 FR-005 E2 E4 the diagram's text, highlighted steps and tags follow the theme", async ({ page }) => {
  for (const state of STATES) {
    await enter(page, state)
    await page.goto(PATH)
    const colors = COLORS[state.theme]
    expect(await page.evaluate(computed('.system-diagram text', 'fill')), state.label).toBe(rgb(colors.text))
    expect(await page.evaluate(computed('.system-diagram .chip.mine', 'stroke')), state.label).toBe(rgb(colors.accent))
    expect(await page.evaluate(computed('.system-diagram .tag', 'fill')), state.label).toBe(rgb(colors.quiet))
  }
})

test('S3.1 FR-006 E5 E7 at 390 and 320 pixels the page never scrolls sideways, and a wider table scrolls in its frame', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto(PATH)
    await fontsSettled(page)
    expect(await page.evaluate('document.documentElement.scrollWidth'), `${width}px`).toBe(width)
    const frames = (await page.evaluate(
      '[...document.querySelectorAll(".table-wrap")].map((el) => ({ fits: el.scrollWidth <= el.clientWidth, right: el.getBoundingClientRect().right }))',
    )) as { fits: boolean; right: number }[]
    expect(frames, `${width}px`).toHaveLength(6)
    for (const frame of frames) expect(frame.right, `${width}px`).toBeLessThanOrEqual(width)
    if (width === 320) expect(frames.some((frame) => !frame.fits), 'some table scrolls at 320px').toBe(true)
  }
})

test("S3.2 FR-006 each table's frame is a named region that takes focus from the keyboard, with a visible ring", async ({ page }) => {
  await page.goto(PATH)
  const frames = page.locator('.table-wrap')
  await expect(frames).toHaveCount(6)
  const names: string[] = []
  for (const frame of await frames.all()) {
    await expect(frame).toHaveAttribute('tabindex', '0')
    const name = (await frame.getAttribute('aria-label')) ?? ''
    expect(name).toMatch(/^Table: \S/)
    await expect(page.getByRole('region', { name, exact: true })).toHaveCount(1)
    names.push(name)
  }
  expect(new Set(names).size, 'each region has its own name').toBe(6)
  // Tab passes the shared header's links (spec 007) on its way to the first table.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate('document.activeElement === document.querySelector(".table-wrap")')) break
  }
  await expect(frames.first()).toBeFocused()
  expect(await page.evaluate(computed(':focus', 'outline-style'))).not.toBe('none')
})

test('S3.3 FR-007 FR-011 E8 the code block wraps, its markers follow the theme, and nothing carries an inline style', async ({ page }) => {
  const marker = { light: '#e36209', dark: '#ffab70' }
  for (const state of STATES) {
    await enter(page, state)
    await page.goto(PATH)
    expect(await page.locator('[style]').count(), state.label).toBe(0)
    expect(await page.evaluate(computed('pre', 'white-space')), state.label).toBe('pre-wrap')
    expect(await page.evaluate(computed('pre .shiki-marker', 'color')), state.label).toBe(rgb(marker[state.theme]))
    expect(await page.evaluate('document.querySelector("pre").scrollWidth <= document.querySelector("pre").clientWidth'), state.label).toBe(true)
  }
})

test('S4.4 FR-011 the essay requests nothing from another host, runs no script, and logs no error', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin
  const requests: string[] = []
  const errors: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  for (const state of STATES) {
    await enter(page, state)
    await page.goto(PATH)
    await fontsSettled(page)
  }
  for (const url of requests) expect(new URL(url).origin, url).toBe(origin)
  expect(await page.locator('script').count()).toBe(0)
  expect(errors).toEqual([])
})

test("S4.5 the served essay passes html-validate with the repo's config, and its internal links and anchors resolve", async ({ page, request }) => {
  const html = await (await request.get(PATH)).text()
  const report = await new HtmlValidate(JSON.parse(readFileSync(repoPath('.htmlvalidate.json'), 'utf8')) as ConfigData).validateString(html, 'vindecoded-agents.html')
  const messages = report.results.flatMap((result) => result.messages.map((message) => `${message.line}:${message.column} ${message.ruleId} ${message.message}`))
  expect(messages).toEqual([])
  await page.goto(PATH)
  const hrefs = (await page.evaluate('[...document.querySelectorAll("a[href], link[href]")].map((el) => el.getAttribute("href"))')) as string[]
  for (const href of hrefs.filter((value) => value.startsWith('/') || value.startsWith('#'))) {
    if (href.startsWith('#')) expect(await page.locator(`[id="${href.slice(1)}"]`).count(), href).toBe(1)
    else expect((await request.get(href)).status(), href).toBe(200)
  }
})
