import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'

// Spec 023, Story 4 in the browser: /evals from the committed run, at WCAG
// 2.2 AA, without script, noindex, with nothing private, and its snapshots.
// Spec 003's settings apply: the pinned container, no pixel tolerance.
// Baselines come from pnpm test:visual tests/023 --update.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const theme of ['light', 'dark'] as const) {
  test(`S4.5 /evals has no violation at WCAG 2.2 AA, with a case open, ${theme}`, async ({ page }) => {
    for (const viewport of [PHONE, DESKTOP]) {
      await enter(page, { viewport, theme })
      await page.goto('/evals')
      await page.locator('.evals__case summary').first().click()
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      expect(
        results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`)),
      ).toEqual([])
    }
  })

  for (const [size, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`S4.1 S4.2 /evals's summary and first suite match their baseline, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await page.goto('/evals')
      await page.locator('.evals__case summary').first().click()
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await expect(page.locator('main')).toHaveScreenshot(`evals-${size}-${theme}.png`, { timeout: 60_000 })
    })
  }
}

test('S4.1 S4.2 the page shows the run, every suite and every case, each case opening without script', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP })
  const page = await context.newPage()
  await page.goto('/evals')
  await expect(page.getByRole('heading', { level: 1, name: 'How the chat is tested' })).toBeVisible()
  await expect(page.locator('.ds-stat')).toHaveCount(5)
  await expect(page.locator('.evals__suite')).toHaveCount(5)
  const cases = page.locator('.evals__case')
  expect(await cases.count()).toBeGreaterThanOrEqual(40)
  const first = cases.first()
  await first.locator('summary').click()
  await expect(first.locator('.evals__answer')).toBeVisible()
  await expect(first.locator('.evals__checks li').first()).toBeVisible()
  await context.close()
})

test('S4.4 S4.5 the page is noindex, names no machine path or phone number, calls Brad Brad, and loads nothing from another host', async ({
  page,
}) => {
  const hosts = new Set<string>()
  page.on('request', (request) => hosts.add(new URL(request.url()).origin))
  await page.goto('/evals')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\/|\\Users\\/)
  expect(text).not.toMatch(/\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/)
  expect(text).not.toMatch(/\bR-?\d{3,}\b/)
  const answers = await page.locator('.evals__answer').allInnerTexts()
  for (const answer of answers) expect(answer).not.toMatch(/\b(he|him|his|himself)\b/i)
  expect([...hosts].filter((origin) => origin !== new URL(page.url()).origin)).toEqual([])
})

test('S4.3 FR-010 the footer links /evals', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('footer.ds-footer a.ds-footer__evals')).toHaveAttribute('href', '/evals')
})
