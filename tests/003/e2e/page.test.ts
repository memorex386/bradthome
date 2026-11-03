import { expect, test } from '@playwright/test'
import { enter, fontsSettled, STATES } from '../helpers/e2e.ts'
import { COLORS, PAGE, rgb } from '../helpers/site.ts'

// The empty page, in a real browser, served as Hosting serves it (Story 1,
// FR-003 to FR-006, P1–P6). Computed styles are read in the page with string
// expressions, since the repo's type check has no DOM types.

const computed = (selector: string, property: string): string =>
  `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).getPropertyValue(${JSON.stringify(property)})`

test("S1.1 FR-005 P1 P3 shows the heading, the line and the link, with D93's title, description and lang", async ({ page }) => {
  for (const state of [STATES[0], STATES[2]]) {
    if (state === undefined) continue
    await enter(page, state)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGE.heading)
    await expect(page.getByText(PAGE.line, { exact: true })).toBeVisible()
    const link = page.getByRole('link', { name: PAGE.link })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', PAGE.href)
    await expect(page).toHaveTitle(PAGE.title)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', PAGE.line)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  }
})

test("S1.2 FR-003 P1 P2 P3 P4 each theme uses v0's colors for the background, the text and the link", async ({ page }) => {
  for (const state of STATES) {
    await enter(page, state)
    await page.goto('/')
    const colors = COLORS[state.theme]
    expect(await page.evaluate(computed('body', 'background-color')), state.label).toBe(rgb(colors.background))
    expect(await page.evaluate(computed('h1', 'color')), state.label).toBe(rgb(colors.text))
    expect(await page.evaluate(computed('a', 'color')), state.label).toBe(rgb(colors.accent))
  }
})

test('S1.2 FR-003 a device with no dark setting gets the light theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'no-preference' })
  await page.goto('/')
  expect(await page.evaluate(computed('body', 'background-color'))).toBe(rgb(COLORS.light.background))
})

test('S1.2 FR-003 P2 P4 the theme comes from styles in the head and no script, so the first paint has no flash of the other theme', async ({ page }) => {
  await page.goto('/')
  expect(await page.locator('script').count()).toBe(0)
  expect(await page.locator('head link[rel="stylesheet"], head style').count()).toBeGreaterThan(0)
  expect(await page.locator('body link[rel="stylesheet"], body style').count()).toBe(0)
})

test('S1.3 FR-004 FR-006 P6 every request goes to the site itself, and both fonts come from it', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin
  const requests: { url: string; type: string }[] = []
  page.on('request', (request) => requests.push({ url: request.url(), type: request.resourceType() }))
  await page.goto('/')
  await fontsSettled(page)
  expect(requests.length).toBeGreaterThan(0)
  for (const request of requests) expect(new URL(request.url).origin, request.url).toBe(origin)
  expect(requests.filter((request) => request.type === 'font').length).toBeGreaterThanOrEqual(2)
  expect(await page.evaluate('[...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family).join("|")')).toMatch(/Charis SIL[\s\S]*Inter|Inter[\s\S]*Charis SIL/)
})

test('S1.3 FR-004 P6 with the fonts blocked, the heading and the line show at once in a fallback', async ({ page }) => {
  await page.route(/\.(?:woff2?|ttf|otf)(?:\?.*)?$/, (route) => route.abort())
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 1000 })
  await expect(page.getByText(PAGE.line, { exact: true })).toBeVisible({ timeout: 1000 })
  expect(await page.evaluate(computed('h1', 'font-family'))).toMatch(/,/)
  expect(await page.evaluate(computed('p', 'font-family'))).toMatch(/,/)
})

test("S1.3 FR-004 P6 swapping to the fonts doesn't shift the layout", async ({ page }) => {
  // The fonts arrive a second late, so the page paints in the fallbacks first
  // and the swap happens in view, as on a slow phone.
  await page.route(/\.(?:woff2?|ttf|otf)(?:\?.*)?$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await route.continue()
  })
  for (const state of STATES) {
    await enter(page, state)
    await page.goto('/', { waitUntil: 'commit' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await fontsSettled(page)
    const shift = await page.evaluate(
      'new Promise((resolve) => { let total = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) total += entry.value }).observe({ type: "layout-shift", buffered: true }); setTimeout(() => resolve(total), 500) })',
    )
    expect(Number(shift), state.label).toBeLessThan(0.001)
  }
})

test('S1.4 P5 Tab lands on the link with a visible focus ring, and nothing else on the page takes focus', async ({ page }) => {
  for (const state of STATES) {
    await enter(page, state)
    await page.goto('/')
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused, state.label).toHaveAttribute('href', PAGE.href)
    const outline = await page.evaluate(computed(':focus', 'outline-style'))
    const width = Number.parseFloat(await page.evaluate(computed(':focus', 'outline-width')))
    const shadow = await page.evaluate(computed(':focus', 'box-shadow'))
    expect(outline !== 'none' && width > 0 ? true : shadow !== 'none', `${state.label}: ${outline} ${width}px, ${shadow}`).toBe(true)
    expect(await page.evaluate('[...document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")].filter((el) => el.tabIndex >= 0).length')).toBe(1)
  }
})

test('S1.5 with reduced motion on, the page is identical, since nothing on it moves', async ({ page }) => {
  const shots: Buffer[] = []
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion })
    await page.goto('/')
    await fontsSettled(page)
    expect(await page.evaluate('document.getAnimations().length'), reducedMotion).toBe(0)
    shots.push(await page.screenshot({ fullPage: true }))
  }
  expect(shots[0]?.equals(shots[1] ?? Buffer.alloc(0))).toBe(true)
})
