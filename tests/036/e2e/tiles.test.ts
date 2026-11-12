import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { EMAIL } from '../../../apps/site/src/components/ds/contact.ts'
import { DETAILS, PICK, TILES } from '../../../apps/site/src/components/home/hero.ts'
import { builtYears } from '../../../apps/site/src/components/home/tiles.ts'
import { figureOf, yearsSince } from '../../../apps/site/src/components/home/years.ts'
import { resumeHrefOf } from '../../../apps/site/src/components/resume/resume.ts'
import { focused } from '../../009/helpers/e2e.ts'
import { DESKTOP, enter, NARROW, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { dialogOf, fakeApi } from '../../022/helpers/fake-api.ts'
import { bottomOf, tilesOf, watchShifts } from '../helpers/e2e.ts'

// Spec 036 in the browser: the tiles that pick the role, the live years, a
// picked tile's detail, hover and focus, the buttons and chips, the header's
// icons, the corpus's links, and the page with no script. Playwright asks for
// reduced motion by default; the motion tests ask for no-preference.

const ROLE_PAGES = ['/mobile', '/fullstack', '/ai'] as const
const ROLE_OF = { '/mobile': 'mobile', '/fullstack': 'fullstack', '/ai': 'ai' } as const
const SMALL = { width: 375, height: 812 } as const
// The one module before this slice (v2.7.0's), and Brad's Gate 1 allowance.
const MODULE_BEFORE = 12682
const ALLOWANCE = 384
const ACCENT = { light: 'rgb(42, 85, 229)', dark: 'rgb(142, 168, 255)' } as const

const claims = parse(readFileSync(path.resolve(import.meta.dirname, '../../../apps/site/content/claims.yaml'), 'utf8')) as Record<
  string,
  { text: string }
>

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** A day in the visitor's own time, at noon, for page.clock. */
const local = (year: number, month: number, date: number): Date => new Date(year, month - 1, date, 12)

/** One computed style of each element a selector finds, read in the page: a function with the property passed in, not code built from strings. */
const styles = (page: Page, selector: string, property: string): Promise<string[]> =>
  page
    .locator(selector)
    .evaluateAll(
      (elements, name) => elements.map((element) => element.ownerDocument.defaultView?.getComputedStyle(element).getPropertyValue(name) ?? ''),
      property,
    )

/** The figures' words on the page, in order. */
const figures = (page: Page): Promise<string[]> =>
  page.evaluate(`[...document.querySelectorAll('.hero__tile [data-since]')].map((e) => e.textContent.trim())`) as Promise<string[]>

test.describe('the tiles pick the role (story 1)', () => {
  test('S1.1 FR-001 the home asks what you are hiring for, over three tiles that link the role pages, none marked', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await expect(page.getByRole('heading', { level: 2, name: PICK.ask })).toBeVisible()
    const nav = page.getByRole('navigation', { name: PICK.ask })
    const links = nav.getByRole('link')
    await expect(links).toHaveCount(3)
    for (const [i, href] of ['/mobile', '/fullstack', '/ai'].entries()) await expect(links.nth(i)).toHaveAttribute('href', href)
    expect((await tilesOf(page)).map((tile) => [tile.name, tile.current])).toEqual([
      ['Mobile', null],
      ['Full-stack', null],
      ['Applied AI', null],
    ])
    await expect(page.locator('.hero__hint')).toHaveText(PICK.hint)
    await expect(page.locator('.hero__all')).toHaveCount(0)
  })

  test('S1.2 S1.3 SC-002 FR-001 each role page marks its own tile alone and links "Show all roles" home; no page shows "Tailor this page"', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of ['/', ...ROLE_PAGES]) {
      await open(page, address)
      await expect(page.getByText('Tailor this page', { exact: true }), address).toHaveCount(0)
      await expect(page.locator('.hero__proof, .ds-roles'), address).toHaveCount(0)
      if (address === '/') continue
      const tiles = await tilesOf(page)
      expect(
        tiles.filter((tile) => tile.current === 'page').map((tile) => tile.href),
        address,
      ).toEqual([address])
      const all = page.getByRole('link', { name: PICK.all })
      await expect(all).toHaveAttribute('href', '/')
      await expect(page.locator('.hero__hint')).toHaveCount(0)
      const mark = page.locator('.hero__tile[aria-current="page"] .hero__tile-mark svg')
      await expect(mark).toBeVisible()
      expect(await styles(page, '.hero__tile:not([aria-current]) .hero__tile-mark svg', 'visibility')).toEqual(['hidden', 'hidden'])
    }
  })

  test('S1.5 FR-009 Tab goes through the three tiles, then the buttons, each with the 2 px accent ring and at least 44 px tall', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await page.locator('#hero-heading').evaluate((h) => {
      h.setAttribute('tabindex', '-1')
      h.focus()
    })
    const order: string[] = []
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      const ring = await focused(page)
      expect(ring?.outline, ring?.label).toBe('solid')
      expect(ring?.width, ring?.label).toBe(2)
      expect(ring?.color, ring?.label).toBe(ACCENT.light)
      order.push(ring?.label ?? '')
    }
    expect(order[0]).toMatch(/^Mobile/)
    expect(order[1]).toMatch(/^Full-stack/)
    expect(order[2]).toMatch(/^Applied AI/)
    expect(order[3]).toMatch(/^See the work at Hopper/)
    for (const tile of await tilesOf(page)) expect(tile.height, tile.name).toBeGreaterThanOrEqual(44)
  })

  test('S1.6 the tiles sit in a row of three on a desktop, and stack as rows on a phone, with nothing scrolling sideways', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const wide = await tilesOf(page)
    expect(new Set(wide.map((tile) => tile.top)).size).toBe(1)
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'light' })
      for (const address of ['/', ...ROLE_PAGES]) {
        await open(page, address)
        const tiles = await tilesOf(page)
        expect(new Set(tiles.map((tile) => tile.left)).size, `${address} ${viewport.width}`).toBe(1)
        for (let i = 1; i < tiles.length; i++) expect(tiles[i]?.top ?? 0).toBeGreaterThan(tiles[i - 1]?.top ?? 0)
        expect(await page.evaluate('document.documentElement.scrollWidth'), `${address} ${viewport.width}`).toBeLessThanOrEqual(
          viewport.width,
        )
      }
    }
  })

  // On a phone the picked tile's detail moves the tiles after it, a different distance on each page, so there only the
  // mark is named and the tiles swap with the page rather than slide.
  test("S1.7 a role switch names the picked tile's check as the sliding mark, and each tile in place on a desktop but not a phone; reduced motion names none", async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/fullstack')
    const names = () =>
      page.evaluate(
        `[...document.querySelectorAll('.hero__tile')].map((t) => [getComputedStyle(t).viewTransitionName, getComputedStyle(t.querySelector('.hero__tile-mark')).viewTransitionName])`,
      )
    expect(await names()).toEqual([
      ['role-name-1', 'none'],
      ['role-name-2', 'role-pill'],
      ['role-name-3', 'none'],
    ])
    for (const viewport of [PHONE, NARROW]) {
      await enter(page, { viewport, theme: 'light' }, 'no-preference')
      await open(page, '/fullstack')
      expect(await names(), `${viewport.width}`).toEqual([
        ['none', 'none'],
        ['none', 'role-pill'],
        ['none', 'none'],
      ])
    }
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'reduce')
    await open(page, '/fullstack')
    expect(await names()).toEqual([
      ['none', 'none'],
      ['none', 'none'],
      ['none', 'none'],
    ])
  })
})

test.describe('the years count themselves (story 2)', () => {
  test('S2.1 S2.2 FR-002 the build writes each count for its month, as whole years with a "+", and the third tile says Founding', async ({
    page,
    request,
  }) => {
    const html = await (await request.get('/')).text()
    for (const tile of TILES.filter((entry) => entry.since !== undefined)) {
      const built = figureOf(builtYears(tile.since ?? '', new Date()))
      expect(html, tile.name).toContain(`data-since="${tile.since}">${built}<`)
    }
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const mobile = page.locator('#tile-mobile')
    await expect(mobile).toContainText(/\d+\+\s*yrs/)
    await expect(mobile).toHaveAccessibleName(/^Mobile \d+\+ years Android and iOS apps, since May 2015/)
    await expect(page.locator('#tile-fullstack')).toHaveAccessibleName(
      /^Full-stack \d+\+ years web front ends and backend services, since Sep 2016/,
    )
    await expect(page.locator('#tile-ai')).toHaveAccessibleName(/^Applied AI Founding engineer on Hopper's Fintech AI team/)
  })

  test("S2.3 SC-001 FR-002 the visitor's clock counts again in whole months, never a month early", async ({ page }) => {
    // Years after any build, so the visitor's count is the one that shows; the unit tests hold 2027's own dates.
    for (const [day, mobile, fullstack] of [
      [local(2040, 4, 30), 24, 23],
      [local(2040, 5, 1), 25, 23],
      [local(2040, 8, 31), 25, 23],
      [local(2040, 9, 1), 25, 24],
    ] as const) {
      await page.clock.setFixedTime(day)
      await enter(page, { viewport: DESKTOP, theme: 'light' })
      await open(page, '/')
      expect(await figures(page), day.toDateString()).toEqual([`${mobile}+`, `${fullstack}+`])
      expect(yearsSince('2015-05', day.getFullYear(), day.getMonth() + 1)).toBe(mobile)
    }
  })

  test('S2.4 FR-002 a clock behind the build leaves the built counts', async ({ page, request }) => {
    const html = await (await request.get('/mobile')).text()
    const built = [...html.matchAll(/data-since="[\d-]+">(\d+\+)</g)].map((match) => match[1])
    await page.clock.setFixedTime(local(2016, 1, 15))
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/mobile')
    const shown = (await page.evaluate(`[...document.querySelectorAll('[data-since]')].map((e) => e.textContent.trim())`)) as string[]
    expect(shown).toEqual(built)
    // The two counting tiles, and the detail's title in each of its two copies, the phone's and the desktop's.
    expect(shown.length).toBe(4)
  })

  test('S2.6 SC-003 FR-010 one module, grown by at most 384 bytes, and no other script', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    const size = (await (await page.request.get(src)).body()).length
    expect(size - MODULE_BEFORE).toBeLessThanOrEqual(ALLOWANCE)
  })
})

test.describe("a picked tile's detail (story 3)", () => {
  test('S3.1 FR-004 the detail sits under the tiles on a desktop and under the picked tile on a phone, one at a time', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/fullstack')
    await expect(page.locator('.hero__detail--desk')).toBeVisible()
    await expect(page.locator('.hero__detail--phone')).toBeHidden()
    expect(await page.locator('.hero__detail--desk').evaluate((d) => d.getBoundingClientRect().top)).toBeGreaterThan(
      await page.locator('.hero__tiles').evaluate((t) => t.getBoundingClientRect().bottom),
    )
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/fullstack')
    await expect(page.locator('.hero__detail--phone')).toBeVisible()
    await expect(page.locator('.hero__detail--desk')).toBeHidden()
    const [, picked, next] = await tilesOf(page)
    const detail = await page.locator('.hero__detail--phone').boundingBox()
    expect(detail?.y ?? 0).toBeGreaterThan((picked?.top ?? 0) + (picked?.height ?? 0) - 1 - ((await page.evaluate('scrollY')) as number))
    expect((detail?.y ?? 0) + (detail?.height ?? 0)).toBeLessThan((next?.top ?? 0) - ((await page.evaluate('scrollY')) as number))
    await expect(page.locator('.hero__detail')).toHaveCount(2)
    await open(page, '/')
    await expect(page.locator('.hero__detail')).toHaveCount(0)
  })

  test('S3.2 S3.3 FR-004 the detail shows the team line, where the years come from, a timeline and its legend, and three receipts in their own words', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of ROLE_PAGES) {
      const role = ROLE_OF[address]
      const detail = DETAILS[role]
      await open(page, address)
      const panel = page.locator('.hero__detail--desk')
      const tile = TILES.find((entry) => entry.role === role)
      await expect(panel.getByRole('heading', { level: 3 })).toHaveText(
        tile?.since ? new RegExp(`^${tile.name} · \\d+\\+ yrs\\s*years$`) : (tile?.name ?? ''),
      )
      await expect(panel).toContainText(`For your team${detail.team.label}`)
      const receipts = panel.locator('.hero__receipts > li .hero__receipt-text')
      await expect(receipts).toHaveCount(3)
      for (const [i, id] of detail.receipts.entries()) await expect(receipts.nth(i)).toHaveText(claims[id]?.text ?? '')
      if (role === 'ai') {
        await expect(panel).toContainText(`Where it comes from${detail.where?.label ?? ''}`)
        await expect(panel.locator('svg.hero__lanes')).toHaveCount(0)
        continue
      }
      await expect(panel).toContainText('Where the years come from')
      await expect(panel.locator('.hero__detail-where')).toHaveText(claims[tile?.claims[0] ?? '']?.text ?? '')
      await expect(panel.locator('rect.hero__job')).toHaveCount(detail.jobs.length)
      await expect(panel.locator('rect.hero__side')).toHaveCount(1)
      expect(await styles(page, '.hero__detail--desk rect.hero__side', 'stroke-dasharray')).not.toEqual(['none'])
      const legend = (await panel.locator('.hero__legend li').allTextContents()).map((text) => text.replace(/\s+/g, ' ').trim())
      expect(legend.at(-1)).toMatch(/^VINDecoded, on the side 201[56] – now$/)
      expect(legend).toHaveLength(detail.jobs.length + 1)
    }
  })

  test('S3.4 FR-004 "See the work" goes to Hopper, and "Ask about this" opens the chat with the role\'s question, unsent', async ({
    page,
  }) => {
    const api = await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of ROLE_PAGES) {
      const role = ROLE_OF[address]
      await open(page, address)
      const panel = page.locator('.hero__detail--desk')
      await expect(panel.locator('.hero__detail-work')).toHaveAttribute('href', '#hopper')
      const ask = panel.getByRole('link', { name: 'Ask about this' })
      await expect(ask).toHaveAttribute('href', '#contact')
      await ask.click()
      await expect(dialogOf(page).getByLabel('Your question')).toHaveValue(DETAILS[role].ask)
      await page.keyboard.press('Escape')
      await expect(ask).toBeFocused()
    }
    expect(api.posted).toHaveLength(0)
  })
})

test.describe('hover and focus (story 4)', () => {
  test('S4.1 FR-005 hovering a tile lights its word and rows, lifts it 2 px and sweeps its years bar', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await page.waitForTimeout(1800)
    await page.locator('#tile-mobile').hover()
    await page.waitForTimeout(800)
    const lit = (await page.evaluate(`(() => {
      const c = (s) => getComputedStyle(document.querySelector(s))
      return { word: c('.hero__word--1').color, row: c('.hero__row--1').borderColor, other: c('.hero__word--2').color, tile: c('#tile-mobile').translate, bar: c('#tile-mobile .hero__bar-sweep').scale, go: c('#tile-mobile .hero__tile-go').opacity }
    })()`)) as Record<string, string>
    // A scale of 1 on both axes computes to "1": the sweep is drawn across the years.
    expect(lit).toMatchObject({ word: ACCENT.light, row: ACCENT.light, tile: '0px -2px', bar: '1', go: '1' })
    expect(lit.other).not.toBe(ACCENT.light)
  })

  test('S4.2 FR-005 keyboard focus on a tile lights its word and rows too', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'dark' })
    await open(page, '/')
    await page.locator('#tile-mobile').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#tile-fullstack')).toBeFocused()
    const lit = (await page.evaluate(
      `({ word: getComputedStyle(document.querySelector('.hero__word--2')).color, row: getComputedStyle(document.querySelector('.hero__row--2')).borderColor, bar: getComputedStyle(document.querySelector('#tile-fullstack .hero__bar-sweep')).scale })`,
    )) as Record<string, string>
    expect(lit).toEqual({ word: ACCENT.dark, row: ACCENT.dark, bar: '1' })
  })

  test('S4.3 FR-005 with reduced motion hover recolors at once and nothing moves; on a touch screen a tap follows the link', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: DESKTOP, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await open(page, '/')
    await page.locator('#tile-mobile').hover()
    const still = (await page.evaluate(
      `({ word: getComputedStyle(document.querySelector('.hero__word--1')).color, tile: getComputedStyle(document.querySelector('#tile-mobile')).translate, transition: getComputedStyle(document.querySelector('#tile-mobile')).transitionDuration })`,
    )) as Record<string, string>
    expect(still).toEqual({ word: ACCENT.light, tile: 'none', transition: '0s' })
    await context.close()
    const touch = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true })
    const phone = await touch.newPage()
    await open(phone, '/')
    await phone.locator('#tile-ai').tap()
    await expect(phone).toHaveURL(/\/ai$/)
    await touch.close()
  })

  test('S4.4 SC-004 FR-005 hovering every tile, button and chip moves no layout', async ({ page }) => {
    await watchShifts(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/mobile')
    await page.waitForTimeout(1800)
    for (const selector of [
      '#tile-mobile',
      '#tile-fullstack',
      '#tile-ai',
      '.hero__work',
      '.hero__resume',
      '.hero__email .ds-email-split__link',
      '.hero__email .ds-email-split__copy',
      '.hero__profile',
    ]) {
      for (const handle of await page.locator(selector).all()) {
        await handle.hover()
        await page.waitForTimeout(260)
      }
    }
    await page.mouse.move(0, 0)
    await page.waitForTimeout(400)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })
})

test.describe('the buttons and the chips (story 5)', () => {
  test("S5.1 FR-006 after the tiles: the work, the page's résumé PDF naming its role, and the address with its copy button", async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const [address, work, resume, role] of [
      ['/', 'See the work at Hopper', 'Résumé PDF', 'all'],
      ['/mobile', 'See the mobile work at Hopper', 'Mobile résumé PDF', 'mobile'],
      ['/fullstack', 'See the full-stack work at Hopper', 'Full-stack résumé PDF', 'fullstack'],
      ['/ai', 'See the AI work at Hopper', 'Applied AI résumé PDF', 'ai'],
    ] as const) {
      await open(page, address)
      const actions = page.locator('.hero__actions')
      await expect(actions.getByRole('link', { name: work, exact: true })).toHaveAttribute('href', '#hopper')
      await expect(actions.getByRole('link', { name: resume, exact: true })).toHaveAttribute('href', resumeHrefOf(role))
      await expect(actions.getByRole('link', { name: `Email ${EMAIL}` })).toHaveAttribute('href', `mailto:${EMAIL}`)
      await expect(actions.getByRole('button', { name: 'Copy address' })).toBeVisible()
      expect(await bottomOf(page, '.hero__tiles')).toBeLessThan(await bottomOf(page, '.hero__actions'))
      expect(await bottomOf(page, '.hero__actions')).toBeLessThan(await bottomOf(page, '.hero__profiles'))
      for (const box of await actions.locator('a, button').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height)))
        expect(box).toBeGreaterThanOrEqual(44)
    }
  })

  test('S5.2 FR-006 the copy button copies the address with the contact code, shows a check and says so', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await page.locator('.hero__email .ds-email-split__copy').click()
    await expect(page.locator('.hero__email')).toHaveAttribute('data-state', 'copied')
    await expect(page.locator('.hero__email [data-email-status]')).toHaveText(`Copied ${EMAIL} to the clipboard.`)
    expect(await page.evaluate('navigator.clipboard.readText()')).toBe(EMAIL)
    expect(await styles(page, '.hero__email .ds-email-split__icons svg', 'visibility')).toEqual(['hidden', 'visible'])
  })

  test('S5.2 S5.3 FR-006 where the clipboard refuses on a phone, the address shows, selected, in place of "Email"', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
      })
    })
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    const link = page.locator('.hero__email .ds-email-split__link')
    await expect(link).toHaveText(/Email/)
    await expect(link).toHaveAccessibleName(`Email ${EMAIL}`)
    expect(
      await page.locator('.hero__email .ds-email-split__address').evaluate((e) => e.getBoundingClientRect().width),
    ).toBeLessThanOrEqual(1)
    await page.locator('.hero__email .ds-email-split__copy').click()
    await expect(page.locator('.hero__email')).toHaveAttribute('data-state', 'selected')
    await expect(page.locator('.hero__email .ds-email-split__address')).toBeVisible()
    expect(await page.evaluate('String(getSelection())')).toBe(EMAIL)
  })

  test("S5.4 FR-007 GitHub's chip shows the snapshot's avatar, LinkedIn's its logo, and each opens its preview card", async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const github = page.locator('.hero__profiles').getByRole('link', { name: 'GitHub @memorex386' })
    const linkedin = page.locator('.hero__profiles').getByRole('link', { name: 'LinkedIn in/brad-thome' })
    await expect(github).toHaveAttribute('href', 'https://github.com/memorex386')
    await expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/brad-thome/')
    await expect(github.locator('img')).toHaveAttribute('src', /^\/previews\/github-[0-9a-f]+\.webp$/)
    await expect(linkedin.locator('svg.ds-logo--linkedin')).toBeVisible()
    await github.hover()
    await expect(page.locator('#preview-hero-github')).toBeVisible()
    await page.mouse.move(0, 0)
    await expect(page.locator('#preview-hero-github')).toBeHidden()
    await linkedin.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(page.locator('[id^="preview-hero-"]:popover-open')).toHaveCount(1)
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    await expect(page.locator('.hero__profile-handle').first()).toBeHidden()
    const chips = await page.locator('.hero__profile').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    expect(new Set(chips).size).toBe(1)
  })

  test('S5.5 SC-004 FR-010 the hero and header ask no other host for anything', async ({ page }) => {
    const site = new URL(test.info().project.use.baseURL ?? '').host
    const elsewhere: string[] = []
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.protocol !== 'data:' && url.host !== site) elsewhere.push(r.url())
    })
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/mobile')
    await page.locator('.hero__profile').first().hover()
    await page.waitForTimeout(500)
    expect(elsewhere).toEqual([])
  })
})

test.describe('the header keeps the profiles and résumé in view (story 6)', () => {
  test('S6.1 SC-005 FR-008 on a phone GitHub, LinkedIn and the résumé PDF sit beside the menu at 44 px, at the top and while sticky', async ({
    page,
  }) => {
    for (const viewport of [NARROW, SMALL, PHONE, { width: 640, height: 900 }]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/mobile')
      const header = page.locator('header.ds-header')
      const targets = header.locator('.ds-header__end').getByRole('link').or(header.locator('.ds-header__menu > summary'))
      const boxes = await targets.evaluateAll((els) =>
        els
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => ({
            name: e.getAttribute('aria-label') ?? e.textContent?.trim(),
            w: e.getBoundingClientRect().width,
            h: e.getBoundingClientRect().height,
            right: e.getBoundingClientRect().right,
          })),
      )
      expect(
        boxes.map((b) => b.name),
        `${viewport.width}`,
      ).toEqual(['GitHub', 'LinkedIn', 'Résumé PDF', 'Menu'])
      for (const box of boxes) expect([box.w, box.h], `${viewport.width} ${box.name}`).toEqual([44, 44])
      expect(Math.max(...boxes.map((b) => b.right)), `${viewport.width}`).toBeLessThanOrEqual(viewport.width)
      expect(await page.evaluate('document.documentElement.scrollWidth')).toBeLessThanOrEqual(viewport.width)
      await page.evaluate('scrollTo(0, 1500)')
      await page.waitForTimeout(300)
      await expect(header.getByRole('link', { name: 'GitHub' })).toBeInViewport()
      await page.locator('.ds-header__menu > summary').click()
      await expect(page.locator('.ds-header__menu-panel').getByRole('link')).toHaveText(['Hopper', 'Experience', 'On the side', 'Contact'])
    }
  })

  test("S6.2 S6.3 FR-008 a desktop shows the same logos and the page's résumé button; the gallery, evals and privacy pages keep theirs", async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const address of ['/', ...ROLE_PAGES]) {
      await open(page, address)
      const end = page.locator('.ds-header__end')
      await expect(end.getByRole('link', { name: 'GitHub', exact: true })).toBeVisible()
      await expect(end.getByRole('link', { name: 'LinkedIn', exact: true })).toBeVisible()
      const resume = end.getByRole('link', { name: 'Résumé PDF' })
      await expect(resume).toBeVisible()
      await expect(resume).toHaveAttribute('href', resumeHrefOf(address === '/' ? 'all' : ROLE_OF[address as keyof typeof ROLE_OF]))
      await expect(page.locator('.ds-header__menu')).toBeHidden()
    }
    for (const address of ['/evals', '/privacy']) {
      await open(page, address)
      await expect(page.locator('.ds-header__end').getByRole('link')).toHaveCount(2)
    }
    await open(page, '/design-system')
    await expect(
      page.locator('header.ds-header').first().locator('.ds-header__end').getByRole('link', { name: 'Résumé PDF' }),
    ).toBeVisible()
  })

  test("S6.4 over the Hopper band the header's icons and résumé take the band's colors", async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' })
    await open(page, '/')
    await page.locator('#hopper').scrollIntoViewIfNeeded()
    await page.evaluate(`scrollBy(0, 200)`)
    await expect(page.locator('header.ds-header')).toHaveAttribute('data-band', '')
    const colors = (await page.evaluate(
      `[...document.querySelectorAll('.ds-header__icon, .ds-header__resume')].map((e) => getComputedStyle(e).color)`,
    )) as string[]
    expect(colors).toEqual(['rgb(232, 234, 237)', 'rgb(232, 234, 237)', 'rgb(232, 234, 237)'])
  })

  test('S6.5 FR-008 each icon is named, and focusing a logo on a desktop opens its preview card', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const github = page.locator('header').getByRole('link', { name: 'GitHub', exact: true })
    await page.locator('.ds-header__sections a').last().focus()
    await page.keyboard.press('Tab')
    await expect(github).toBeFocused()
    await expect(page.locator('#preview-header-github')).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.locator('#preview-header-linkedin')).toBeVisible()
  })
})

test.describe('the corpus (story 7)', () => {
  test('S7.2 FR-011 the built corpus links each years claim to its tile, and the home holds both anchors', async ({ request }) => {
    const corpus = (await (await request.get('/corpus.json')).json()) as { sources: { id: string; url: string }[] }
    const byId = new Map(corpus.sources.map((source) => [source.id, source.url]))
    expect(byId.get('years-of-experience-1')).toBe('https://bradthome.com/#tile-mobile')
    expect(byId.get('years-of-experience-2')).toBe('https://bradthome.com/#tile-fullstack')
    const home = await (await request.get('/')).text()
    expect(home).toContain('id="tile-mobile"')
    expect(home).toContain('id="tile-fullstack"')
  })
})

test.describe('it still works for everyone (story 8)', () => {
  test.describe('with no script', () => {
    test.use({ javaScriptEnabled: false })

    test('S1.4 S8.3 FR-001 the tiles, detail, buttons, chips and header are whole, every tile is a link, and back returns', async ({
      page,
    }) => {
      await enter(page, { viewport: PHONE, theme: 'light' })
      await open(page, '/')
      await expect(page.locator('.hero__email .ds-email-split__copy')).toBeHidden()
      expect(await styles(page, '.hero__email .ds-email-split__link', 'border-top-right-radius')).not.toEqual(['0px'])
      await page.locator('#tile-mobile').click()
      await expect(page).toHaveURL(/\/mobile$/)
      await expect(page.locator('.hero__detail--phone')).toBeVisible()
      await expect(page.locator('.hero__detail--phone [data-since]')).toHaveText(/^\d+\+$/)
      await expect(page.locator('.hero__detail--phone').getByRole('link', { name: 'Ask about this' })).toHaveAttribute('href', '#contact')
      await expect(page.locator('header').getByRole('link', { name: 'GitHub', exact: true })).toBeVisible()
      await page.getByRole('link', { name: PICK.all }).click()
      await expect(page).toHaveURL(/\/$/)
      await page.goBack()
      await expect(page).toHaveURL(/\/mobile$/)
    })
  })

  test('S8.4 FR-005 the sequence: the lines at 760 and 880 ms, the tiles at 1,000 ms, the buttons and chips at 1,060 ms, done at 1,600 ms, with no layout shift', async ({
    page,
  }) => {
    await watchShifts(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    const rises = (await page.evaluate(
      `document.getAnimations().filter((a) => a.animationName === 'hero-rise').map((a) => [a.effect.target.classList[0], Math.round(a.effect.getTiming().delay), Math.round(Number(a.effect.getTiming().duration))])`,
    )) as [string, number, number][]
    expect(rises.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))).toEqual([
      ['hero__line', 760, 540],
      ['hero__line', 880, 540],
      ['hero__pick', 1000, 540],
      ['hero__actions', 1060, 540],
      ['hero__profiles', 1060, 540],
    ])
    const end = (await page.evaluate(
      `Math.max(...document.getAnimations().filter((a) => a.timeline === document.timeline && String(a.animationName).startsWith('hero-')).map((a) => a.effect.getTiming().delay + Number(a.effect.getTiming().duration)))`,
    )) as number
    expect(end).toBeLessThanOrEqual(1600)
    await page.waitForTimeout(1900)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })

  test('S8.5 SC-004 the tiles end inside the first screen on a laptop and on phones, at rest', async ({ page }) => {
    for (const [viewport, limit] of [
      [DESKTOP, 800],
      [PHONE, 844],
      [SMALL, 812],
    ] as const) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      expect(await bottomOf(page, '.hero__tiles'), `${viewport.width} × ${viewport.height}`).toBeLessThanOrEqual(limit)
    }
  })
})
