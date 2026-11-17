import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { parse } from 'yaml'
import { DESKTOP, enter, NARROW } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { dialogOf, fakeApi } from '../../022/helpers/fake-api.ts'
import { fakePrep, mapPosting, openPrep, PREP_ANSWER, ROLE_ANSWER } from '../../024/helpers/fake-prep.ts'
import { watchShifts } from '../../036/helpers/e2e.ts'

// Spec 042 in the browser: "What I'm looking for" between On the side and Get
// in touch on the home and each role page, its words against wants.yaml, the
// lit track, the buttons, the reveal, the page with no script, prep's fixed
// card, and what holds (D241–D243). Playwright asks for reduced motion by
// default; the reveal test asks for no-preference. Baselines are in
// a11y-visual.test.ts.

const PAGES = ['/', '/mobile', '/fullstack', '/ai'] as const
const SMALL = { width: 375, height: 812 } as const
const WIDE = { width: 1440, height: 900 } as const
const SITE = 'https://bradthome.com'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const WANTS = parse(readFileSync(path.join(ROOT, 'apps', 'site', 'content', 'wants.yaml'), 'utf8')) as Record<string, { slot: string; text: string }>
const textOf = (slot: string): string => WANTS[`looking-for-${slot}`]?.text ?? ''

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

const normal = (text: string | null): string => (text ?? '').replace(/\s+/g, ' ').trim()

test.describe('the section (story 1)', () => {
  for (const address of PAGES) {
    test(`S1.1 SC-001 FR-003 ${address} runs hero, Hopper, Experience, On the side, What I'm looking for, then Get in touch`, async ({ page }) => {
      await open(page, address)
      const ids = await page.locator('main > section, main > div > section').evaluateAll((sections) => sections.map((section) => section.id))
      const order = ['hopper', 'experience', 'side', 'looking-for', 'contact'].map((id) => ids.indexOf(id))
      expect(order.every((at) => at >= 0)).toBe(true)
      expect(order).toEqual([...order].sort((a, b) => a - b))
      expect(ids.indexOf('contact')).toBe(ids.indexOf('looking-for') + 1)
      const section = page.locator('#looking-for')
      await expect(section).toHaveAttribute('aria-labelledby', 'fit-heading')
      await expect(section.getByRole('heading', { level: 2 })).toHaveText("What I'm looking for")
    })

    test(`S1.3 S2.1 ${address}'s lede, rows and tracks are wants.yaml's lines as written, each once`, async ({ page }) => {
      await open(page, address)
      expect(normal(await page.locator('#looking-for-lede').textContent())).toBe(textOf('lede'))
      const rows = page.locator('#looking-for .fit__row')
      expect(await rows.locator('dt').allTextContents()).toEqual(['Role', 'Team', 'How I build', 'Fields', 'People', 'Where'])
      for (const slot of ['role', 'team', 'fields', 'people', 'where']) {
        expect(normal(await page.locator(`#looking-for-${slot} dd`).textContent()), slot).toBe(textOf(slot))
      }
      expect(normal(await page.locator('#looking-for-build dd').textContent())).toBe(`${textOf('build')} See how this site is built`)
      await expect(page.locator('#looking-for-build a')).toHaveAttribute('href', 'https://github.com/memorex386/bradthome')
      for (const slot of ['mobile', 'fullstack', 'ai']) {
        expect(normal(await page.locator(`#looking-for-${slot} .fit__track-text`).textContent()), slot).toBe(textOf(slot))
      }
      const body = normal(await page.locator('body').textContent())
      for (const [id, want] of Object.entries(WANTS)) expect(body.split(want.text).length - 1, id).toBe(1)
    })
  }

  test('S1.4 the home’s tracks run Mobile, Full-stack, Applied AI, at rest, each heading linking its page', async ({ page }) => {
    await open(page, '/')
    const tracks = page.locator('#looking-for .fit__track')
    expect(await tracks.evaluateAll((items) => items.map((item) => item.id))).toEqual(['looking-for-mobile', 'looking-for-fullstack', 'looking-for-ai'])
    expect(await page.locator('#looking-for .fit__track-name a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
      '/mobile',
      '/fullstack',
      '/ai',
    ])
    await expect(page.locator('#looking-for .fit__track--lit, #looking-for .fit__track--dim, #looking-for .fit__this')).toHaveCount(0)
  })

  for (const [address, own, rest] of [
    ['/mobile', 'mobile', ['fullstack', 'ai']],
    ['/fullstack', 'fullstack', ['mobile', 'ai']],
    ['/ai', 'ai', ['mobile', 'fullstack']],
  ] as const) {
    test(`S1.5 FR-006 ${address} shows its own track first, lit with "This page" and no link, then the other two, dimmed, linking their pages`, async ({
      page,
    }) => {
      await open(page, address)
      const ids = await page.locator('#looking-for .fit__track').evaluateAll((items) => items.map((item) => item.id))
      expect(ids).toEqual([own, ...rest].map((slot) => `looking-for-${slot}`))
      const lit = page.locator(`#looking-for-${own}`)
      await expect(lit).toHaveClass(/fit__track--lit/)
      await expect(lit.locator('.fit__this')).toHaveText('This page')
      await expect(lit.locator('a')).toHaveCount(0)
      for (const slot of rest) {
        await expect(page.locator(`#looking-for-${slot}`)).toHaveClass(/fit__track--dim/)
        await expect(page.locator(`#looking-for-${slot} .fit__track-name a`)).toHaveAttribute('href', `/${slot}`)
      }
    })
  }

  test('S1.2 on a desktop the left column sits beside the rows; on a phone, and at 320 px, everything stacks and nothing scrolls sideways', async ({
    page,
  }) => {
    await enter(page, { viewport: WIDE, theme: 'light' })
    await open(page, '/')
    const head = await page.locator('#looking-for .fit__head').boundingBox()
    const rows = await page.locator('#looking-for .fit__rows').boundingBox()
    const tracks = await page.locator('#looking-for .fit__tracks').boundingBox()
    expect((head?.x ?? 0) + (head?.width ?? 0)).toBeLessThan(rows?.x ?? 0)
    expect(tracks?.y ?? 0).toBeGreaterThan((rows?.y ?? 0) + (rows?.height ?? 0) - 1)
    for (const viewport of [SMALL, NARROW]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/fullstack')
      const stacked = await page
        .locator('#looking-for .fit__head, #looking-for .fit__rows, #looking-for .fit__tracks')
        .evaluateAll((blocks) => blocks.map((block) => block.getBoundingClientRect().top))
      expect(stacked, `${viewport.width}`).toEqual([...stacked].sort((a, b) => a - b))
      expect(await page.evaluate('document.documentElement.scrollWidth'), `${viewport.width}`).toBeLessThanOrEqual(viewport.width)
    }
  })

  test('S1.6 FR-007 "Email Brad" links #contact, and "Ask about this" opens the chat with its question in the box, unsent', async ({ page }) => {
    const api = await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await expect(page.locator('#looking-for').getByRole('link', { name: 'Email Brad' })).toHaveAttribute('href', '#contact')
    const ask = page.locator('#looking-for').getByRole('link', { name: 'Ask about this' })
    await expect(ask).toHaveAttribute('href', '#contact')
    await ask.click()
    const box = dialogOf(page).getByLabel('Your question')
    await expect(box).toHaveValue('What kind of role is Brad looking for?')
    await expect(box).toBeFocused()
    expect(api.posted).toHaveLength(0)
  })

  test('S1.8 the header keeps its four links, and marks On the side while the section is read', async ({ page }) => {
    await enter(page, { viewport: WIDE, theme: 'light' })
    await open(page, '/')
    const header = page.locator('.ds-header')
    // The bar and its menu each list the sections, so each link counts once.
    expect(await header.locator('a[href^="#"]').evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('href')))])).toEqual([
      '#hopper',
      '#experience',
      '#side',
      '#contact',
    ])
    await bring(page, '#looking-for-where', 0.3, 300)
    await expect(header.locator('a[aria-current="location"]')).toHaveAttribute('href', '#side')
  })

  test('S1.7 FR-013 with motion allowed each block reveals once: 8 px in 260 ms, 60 ms apart, the rows after the left column, the lit bar in 320 ms', async ({
    page,
  }) => {
    await enter(page, { viewport: WIDE, theme: 'light' }, 'no-preference')
    await open(page, '/fullstack')
    await settle(page)
    await bring(page, '#looking-for', 0.35, 30)
    const timings = (selector: string) =>
      page.evaluate(
        `[...document.querySelectorAll('${selector}')].flatMap((el) => el.getAnimations().filter((a) => a.animationName === 'ds-rv-rise').map((a) => [Math.round(Number(a.effect.getTiming().duration)), Math.round(Number(a.effect.getTiming().delay))]))`,
      ) as Promise<number[][]>
    expect(await timings('#looking-for .fit__head > *')).toEqual([
      [260, 0],
      [260, 60],
      [260, 120],
      [260, 180],
    ])
    expect(await timings('#looking-for .fit__rows > *')).toEqual([0, 1, 2, 3, 4, 5].map((i) => [260, 240 + i * 60]))
    await bring(page, '#looking-for .fit__tracks', 0.5, 30)
    expect(await timings('#looking-for .fit__tracks > *')).toEqual([0, 1, 2].map((i) => [260, i * 60]))
    const bar = (await page.evaluate(
      `document.querySelector('#looking-for-fullstack').getAnimations({ subtree: true }).filter((a) => a.animationName === 'ds-rv-draw-down').map((a) => [Math.round(Number(a.effect.getTiming().duration)), Math.round(Number(a.effect.getTiming().delay))])`,
    )) as number[][]
    expect(bar).toEqual([[320, 260]])
    await page.waitForTimeout(1200)
    await bring(page, '#side', 0.1)
    await bring(page, '#looking-for', 0.35, 300)
    expect(
      await page.evaluate(`document.querySelector('#looking-for').getAnimations({ subtree: true }).filter((a) => String(a.animationName).startsWith('ds-rv')).length`),
    ).toBe(0)
  })

  test('S1.7 with reduced motion the section is at rest and never posed', async ({ page }) => {
    await enter(page, { viewport: WIDE, theme: 'light' })
    await open(page, '/fullstack')
    await bring(page, '#looking-for', 0.35, 300)
    expect(
      await page.evaluate(
        `[...document.querySelectorAll('#looking-for [data-reveal]')].map((el) => el.dataset.rv ?? 'rest').concat(document.querySelector('#looking-for').getAnimations({ subtree: true }).map(() => 'moving'))`,
      ),
    ).toEqual(['rest', 'rest', 'rest'])
  })
})

test.describe('the corpus and llms.txt (story 4)', () => {
  test('S4.1 S4.2 FR-008 the served corpus and llms.txt hold the ten wants, and each link lands on its row or track', async ({ page }) => {
    const corpus = JSON.parse(await (await page.request.get('/corpus.json')).text()) as { sources: { id: string; kind: string; url: string; text: string }[] }
    const wants = corpus.sources.filter((source) => source.kind === 'want')
    expect(wants.map((source) => [source.id, source.text])).toEqual(Object.entries(WANTS).map(([id, want]) => [id, want.text]))
    const llms = await (await page.request.get('/llms.txt')).text()
    expect(llms).toContain('## Looking for')
    for (const source of wants) expect(llms).toContain(`ID \`${source.id}\`. ${source.text}`)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    for (const source of wants) {
      const hash = source.url.slice(SITE.length + 1)
      await open(page, `/${hash}`)
      await expect(page.locator(hash), hash).toBeInViewport()
    }
  })
})

test.describe('prep’s fixed card (story 5)', () => {
  test('S5.1 S5.2 FR-011 FR-012 an answer for an AI role shows Role, Team, How I build, then the Applied AI track, with its link', async ({ page }) => {
    await fakePrep(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await openPrep(page)
    await mapPosting(page, 'Senior Software Engineer, AI Products. Ship AI features in production apps.')
    const card = dialogOf(page).locator('[data-prep-wants]')
    await expect(card.getByRole('heading', { level: 3 })).toHaveText('What Brad is looking for')
    expect(await card.locator('dt').allTextContents()).toEqual(['Role', 'Team', 'How I build', 'Applied AI'])
    expect(await card.locator('dd').allTextContents()).toEqual([textOf('role'), textOf('team'), textOf('build'), textOf('ai')])
    await expect(card.getByRole('link', { name: "What I’m looking for" })).toHaveAttribute('href', '/#looking-for')
    expect(normal(await card.textContent())).not.toMatch(/\bfit\b/i)
    expect(PREP_ANSWER.role).toBe('Senior Software Engineer, AI Products')
  })

  test('S5.2 a named role shows its track: "Staff Android engineer" shows Mobile', async ({ page }) => {
    await fakePrep(page, [{ kind: 'answer', answer: ROLE_ANSWER }])
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await openPrep(page)
    await mapPosting(page, 'Staff Android engineer')
    const card = dialogOf(page).locator('[data-prep-wants]')
    expect(ROLE_ANSWER.role).toBe('Staff Android engineer')
    await expect(card).toBeVisible()
    expect(await card.locator('dt').allTextContents()).toEqual(['Role', 'Team', 'How I build', 'Mobile'])
    expect((await card.locator('dd').allTextContents()).at(-1)).toBe(textOf('mobile'))
  })

  test('S5.3 the card shows nothing while working or for a text that isn’t a posting', async ({ page }) => {
    await fakePrep(page, [{ kind: 'hold' }])
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await openPrep(page)
    await mapPosting(page, 'Senior Software Engineer, AI Products.')
    await page.waitForTimeout(300)
    await expect(dialogOf(page).locator('[data-prep-wants]')).toHaveCount(0)
  })
})

test.describe('everything else holds (story 6)', () => {
  test('S6.1 SC-004 FR-013 the page loads only the one module, main’s 13,010 bytes', async ({ page }) => {
    await open(page, '/')
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    expect((await (await page.request.get(src)).body()).length).toBe(13_010)
  })

  test('S6.3 SC-004 layout shift stays 0 loading the home and scrolling through the section to its end', async ({ page }) => {
    await watchShifts(page)
    await enter(page, { viewport: WIDE, theme: 'light' }, 'no-preference')
    await open(page, '/')
    for (const share of [0.9, 0.5, 0.1]) await bring(page, '#looking-for', share, 200)
    await bring(page, '#contact', 0.2, 1200)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })

  test('S6.4 with no script the section is whole and at rest, and both buttons reach #contact', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE })
    const page = await context.newPage()
    await page.goto('/mobile')
    await expect(page.locator('#looking-for .fit__row')).toHaveCount(6)
    await expect(page.locator('#looking-for .fit__track')).toHaveCount(3)
    expect(await page.locator('#looking-for [data-rv]').count()).toBe(0)
    await page.locator('#looking-for').getByRole('link', { name: 'Ask about this' }).click()
    await expect(page).toHaveURL(/#contact$/)
    await context.close()
  })

  test('S6.2 every link and button in the section is 44 px or more', async ({ page }) => {
    for (const viewport of [SMALL, WIDE]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/fullstack')
      const sizes = await page
        .locator('#looking-for .ds-button, #looking-for .fit__track:has(.fit__track-link)')
        .evaluateAll((items) => items.map((item) => [item.getBoundingClientRect().width, item.getBoundingClientRect().height]))
      for (const [width, height] of sizes) {
        expect(width, `${viewport.width}`).toBeGreaterThanOrEqual(44)
        expect(height, `${viewport.width}`).toBeGreaterThanOrEqual(44)
      }
      const proof = await page.locator('#looking-for .fit__proof').boundingBox()
      expect(proof?.height ?? 0, 'the proof link sits in a line of body text, as every inline link does (WCAG 2.5.8’s inline exception)').toBeGreaterThan(0)
    }
  })
})
