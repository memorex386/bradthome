import { expect, test } from '@playwright/test'
import { enter, fontsSettled, STATES } from '../helpers/e2e.ts'
import { COLORS, PAGE, rgb, SCROLLER, TAB_ORDER } from '../helpers/site.ts'

// The essay, the page that keeps v1's layout since v2.0 (D167), in a real
// browser, served as Hosting serves it (Story 1, FR-003 to FR-006, P1–P6). Computed styles are read in the page with string
// expressions, since the repo's type check has no DOM types.

const computed = (selector: string, property: string): string =>
  `getComputedStyle(document.querySelector(${JSON.stringify(selector)})).getPropertyValue(${JSON.stringify(property)})`

test("S1.1 FR-005 P1 P3 shows the heading, the byline and the link home, with the essay's title, description and lang (D112, D167)", async ({ page }) => {
  for (const state of [STATES[0], STATES[2]]) {
    if (state === undefined) continue
    await enter(page, state)
    await page.goto(PAGE.path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGE.heading)
    await expect(page.getByText(PAGE.line, { exact: true })).toBeVisible()
    const link = page.getByRole('banner').getByRole('link', { name: PAGE.link })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', PAGE.href)
    await expect(page).toHaveTitle(PAGE.title)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', PAGE.description)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  }
})

test("S1.2 FR-003 P1 P2 P3 P4 each theme uses v0's colors for the background, the text and the header's quiet links", async ({ page }) => {
  for (const state of STATES) {
    await enter(page, state)
    await page.goto(PAGE.path)
    const colors = COLORS[state.theme]
    expect(await page.evaluate(computed('body', 'background-color')), state.label).toBe(rgb(colors.background))
    expect(await page.evaluate(computed('h1', 'color')), state.label).toBe(rgb(colors.text))
    expect(await page.evaluate(computed('.site-header nav a', 'color')), state.label).toBe(rgb(colors.quiet))
  }
})

test('S1.2 FR-003 a device with no dark setting gets the light theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'no-preference' })
  await page.goto(PAGE.path)
  expect(await page.evaluate(computed('body', 'background-color'))).toBe(rgb(COLORS.light.background))
})

test('S1.2 FR-003 P2 P4 the theme comes from styles in the head and no script, so the first paint has no flash of the other theme', async ({ page }) => {
  await page.goto(PAGE.path)
  expect(await page.locator('script').count()).toBe(0)
  expect(await page.locator('head link[rel="stylesheet"], head style').count()).toBeGreaterThan(0)
  expect(await page.locator('body link[rel="stylesheet"], body style').count()).toBe(0)
})

test('S1.3 FR-004 FR-006 P6 every request goes to the site itself, and both fonts come from it', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin
  const requests: { url: string; type: string }[] = []
  page.on('request', (request) => requests.push({ url: request.url(), type: request.resourceType() }))
  await page.goto(PAGE.path)
  await fontsSettled(page)
  expect(requests.length).toBeGreaterThan(0)
  for (const request of requests) expect(new URL(request.url).origin, request.url).toBe(origin)
  expect(requests.filter((request) => request.type === 'font').length).toBeGreaterThanOrEqual(2)
  expect(await page.evaluate('[...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family).join("|")')).toMatch(/Charis SIL[\s\S]*Inter|Inter[\s\S]*Charis SIL/)
})

test('S1.3 FR-004 P6 with the fonts blocked, the heading and the line show at once in a fallback', async ({ page }) => {
  await page.route(/\.(?:woff2?|ttf|otf)(?:\?.*)?$/, (route) => route.abort())
  await page.goto(PAGE.path, { waitUntil: 'domcontentloaded' })
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
    await page.goto(PAGE.path, { waitUntil: 'commit' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await fontsSettled(page)
    const shift = await page.evaluate(
      'new Promise((resolve) => { let total = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) total += entry.value }).observe({ type: "layout-shift", buffered: true }); setTimeout(() => resolve(total), 500) })',
    )
    expect(Number(shift), state.label).toBeLessThan(0.001)
  }
})

test("S1.4 P5 Tab reaches the page's links and scrollable regions in order, each with a visible focus ring, and nothing else takes focus (D112, D167)", async ({ page }) => {
  for (const state of STATES) {
    await enter(page, state)
    await page.goto(PAGE.path)
    for (const href of TAB_ORDER) {
      await page.keyboard.press('Tab')
      const focused = page.locator(':focus')
      if (href === SCROLLER) await expect(focused, state.label).toHaveAttribute('tabindex', '0')
      else await expect(focused, state.label).toHaveAttribute('href', href)
      const outline = await page.evaluate(computed(':focus', 'outline-style'))
      const width = Number.parseFloat(await page.evaluate(computed(':focus', 'outline-width')))
      const shadow = await page.evaluate(computed(':focus', 'box-shadow'))
      expect(outline !== 'none' && width > 0 ? true : shadow !== 'none', `${state.label} ${href}: ${outline} ${width}px, ${shadow}`).toBe(true)
    }
    expect(await page.evaluate('[...document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")].filter((el) => el.tabIndex >= 0).length')).toBe(TAB_ORDER.length)
  }
})

test('S1.5 with reduced motion on, the page is identical, since nothing on it moves', async ({ page }) => {
  const shots: Buffer[] = []
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion })
    await page.goto(PAGE.path)
    await fontsSettled(page)
    expect(await page.evaluate('document.getAnimations().length'), reducedMotion).toBe(0)
    shots.push(await page.screenshot({ fullPage: true }))
  }
  expect(shots[0]?.equals(shots[1] ?? Buffer.alloc(0))).toBe(true)
})
