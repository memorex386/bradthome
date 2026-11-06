import { expect, test } from '@playwright/test'

// Spec 019, the v2.0 relaunch, in a real browser served as Hosting serves it:
// the home at /, the /v2 redirect, the share tags, indexing and the essay.

test('S1.1 FR-001 the root shows the new home, with no noindex and the canonical link to the root', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle('Brad Thome')
  await expect(page.locator('#hopper')).toHaveCount(1)
  await expect(page.locator('#contact')).toHaveCount(1)
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://bradthome.com/')
})

test('S1.2 FR-001 /v2 answers 301 to the root, and a browser lands on the home (D162)', async ({ page, request }) => {
  const response = await request.get('/v2', { maxRedirects: 0 })
  expect(response.status()).toBe(301)
  expect(new URL(response.headers().location ?? '', 'http://x').pathname).toBe('/')
  await page.goto('/v2#hopper')
  await expect(page).toHaveURL((url) => url.pathname === '/' && url.hash === '#hopper')
})

test("S1.5 the home carries v1's link-preview tags", async ({ page }) => {
  await page.goto('/')
  for (const [selector, attribute, value] of [
    ['meta[name="author"]', 'content', 'Brad Thome'],
    ['meta[property="og:type"]', 'content', 'website'],
    ['meta[property="og:site_name"]', 'content', 'Brad Thome'],
    ['meta[property="og:title"]', 'content', 'Brad Thome'],
    ['meta[property="og:url"]', 'content', 'https://bradthome.com/'],
    ['meta[name="twitter:card"]', 'content', 'summary'],
  ] as const)
    await expect(page.locator(selector), selector).toHaveAttribute(attribute, value)
  const description = await page.locator('meta[name="description"]').getAttribute('content')
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description ?? '')
})

test('S2.1 FR-004 only the home and the essay go without noindex (D168)', async ({ page }) => {
  for (const address of ['/', '/vindecoded-agents']) {
    await page.goto(address)
    await expect(page.locator('meta[name="robots"]'), address).toHaveCount(0)
  }
  for (const address of ['/mobile', '/fullstack', '/ai', '/privacy', '/design-system']) {
    await page.goto(address)
    await expect(page.locator('meta[name="robots"]'), address).toHaveAttribute('content', 'noindex')
  }
})

test('S2.2 S2.3 FR-004 robots.txt names the sitemap, which lists the home and the essay', async ({ request }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toContain('Sitemap: https://bradthome.com/sitemap.xml')
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  expect([...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])).toEqual([
    'https://bradthome.com/',
    'https://bradthome.com/vindecoded-agents',
  ])
})

test("S3.1 FR-005 the essay's title and heading are D163's", async ({ page }) => {
  await page.goto('/vindecoded-agents')
  await expect(page).toHaveTitle('Running a 1.4M-download product with AI agents · Brad Thome')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Running a 1.4M‑download product with AI agents')
})
