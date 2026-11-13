import { expect, type Page, test } from '@playwright/test'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { dialogOf, fakeApi } from '../../022/helpers/fake-api.ts'

// Spec 030 in the browser: a claim opens Ask about Brad with its question in
// the box, unsent; the links that stay links; the claims' cases against the
// built page's questions; and MA-20 (D213). Every question goes to spec
// 022's fake API, never the real one. Amended by spec 038 (D230): each
// claim's sparkle is the asker, in place of "Ask me" and the drawers' links,
// which are gone with the drawers (D229).

// The one module before this slice (spec 029's build), and Brad's Gate 1 allowance.
const MODULE_BEFORE = 11049
const ALLOWANCE = 384
const SPRING = 'cubic-bezier(0.3, 1.32, 0.52, 1)'
const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.2, 1)'

const box = (page: Page) => dialogOf(page).getByLabel('Your question')

/** Every element on the page that hands the chat a question, with its question and whether it's a claim's sparkle or a tile's. */
const askers = (page: Page): Promise<{ index: number; question: string; claim: boolean; tile: boolean }[]> =>
  page.evaluate(
    `[...document.querySelectorAll('[data-chat-ask]')].map((a, index) => ({ index, question: a.dataset.chatAsk, claim: a.classList.contains('ds-claim-ask'), tile: a.closest('.hero__detail') !== null }))`,
  ) as Promise<{ index: number; question: string; claim: boolean; tile: boolean }[]>

/** Taps an asker, as a visitor would. Amended by spec 038: there's no drawer to open first. */
async function tapAsker(page: Page, index: number): Promise<void> {
  await page.locator('[data-chat-ask]').nth(index).click()
  await box(page).waitFor()
}

test.describe('a claim asks about itself (story 1)', () => {
  // Amended by spec 038 (D230): the 30 claims' sparkles are the page's askers, and nothing else on / asks.
  test('S1.1 S1.2 S1.5 SC-001 FR-001 every sparkle on / opens the chat with its question, unsent, and focus returns', async ({ page }) => {
    const api = await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const all = await askers(page)
    expect(all.filter((a) => a.claim)).toHaveLength(30)
    expect(all.filter((a) => !a.claim)).toHaveLength(0)
    for (const { index, question } of all) {
      await tapAsker(page, index)
      await expect(box(page), question).toHaveValue(question)
      await expect(box(page)).toBeFocused()
      await expect(dialogOf(page).getByRole('button', { name: 'Ask', exact: true })).toHaveAttribute('aria-pressed', 'true')
      await page.keyboard.press('Escape')
      await expect(dialogOf(page)).toBeHidden()
      await expect(page.locator('[data-chat-ask]').nth(index)).toBeFocused()
    }
    expect(api.posted).toHaveLength(0)
  })

  test('S1.3 sending the question asks it as any other', async ({ page }) => {
    const api = await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const [first] = await askers(page)
    await tapAsker(page, first?.index ?? 0)
    await box(page).press('Enter')
    await expect.poll(() => api.posted.length).toBe(1)
    expect(JSON.stringify(api.posted[0])).toContain(JSON.stringify(first?.question).slice(1, -1))
  })

  test('S1.4 a second sparkle, after an answer or from Prep, replaces the box in Ask mode and keeps the conversation', async ({ page }) => {
    await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const all = await askers(page)
    const [one, two] = all.filter((a) => a.claim)
    await tapAsker(page, one?.index ?? 0)
    await box(page).press('Enter')
    await expect(
      dialogOf(page)
        .getByText(one?.question ?? '-', { exact: false })
        .first(),
    ).toBeVisible()
    await dialogOf(page).getByRole('button', { name: 'Interview prep' }).click()
    await page.keyboard.press('Escape')
    await tapAsker(page, two?.index ?? 0)
    await expect(box(page)).toHaveValue(two?.question ?? '')
    await expect(dialogOf(page).getByRole('button', { name: 'Ask', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(
      dialogOf(page)
        .getByText(one?.question ?? '-', { exact: false })
        .first(),
    ).toBeVisible()
  })
})

test.describe('each question finds its claim (story 2)', () => {
  // Amended by spec 036 (D223): a role page's tile detail asks its role's question too, which is a facts case of its own.
  // Amended by spec 038 (D230): the cases are the sparkles' 30 questions.
  test('S2.1 SC-002 FR-003 the suite’s claim cases are exactly the built page’s questions, on / and each role page', async ({ page }) => {
    const cases = CASES.filter((c) => c.id.startsWith('facts-receipt')).map((c) => c.question)
    expect(cases).toHaveLength(30)
    for (const address of ['/', '/mobile', '/fullstack', '/ai']) {
      await page.goto(address)
      const all = await askers(page)
      const questions = [...new Set(all.filter((a) => !a.tile).map((a) => a.question))]
      expect(questions.sort(), address).toEqual([...cases].sort())
      const tile = [...new Set(all.filter((a) => a.tile).map((a) => a.question))]
      const role = address.slice(1)
      expect(tile, address).toEqual(role === '' ? [] : [CASES.find((c) => c.id === `facts-tile-${role}`)?.question])
    }
  })
})

test.describe('without the chat, a sparkle still reaches Brad (story 3)', () => {
  test.describe('with no script', () => {
    test.use({ javaScriptEnabled: false })

    // Amended by spec 038 (D230): the sparkle is a plain link, with no drawer to open first.
    test('S3.1 FR-004 each sparkle goes to the contact section', async ({ page }) => {
      await enter(page, { viewport: PHONE, theme: 'light' })
      await page.goto('/')
      const hrefs = await page.evaluate(
        `[...new Set([...document.querySelectorAll('[data-chat-ask]')].map((a) => a.getAttribute('href')))]`,
      )
      expect(hrefs).toEqual(['#contact'])
      await page.locator('.hopper__topic .ds-claim-ask').first().click()
      await expect(page).toHaveURL(/#contact$/)
    })
  })

  // Amended by spec 038 (D230): the gallery's sparkles show the part, on a page with no chat.
  test('S3.2 a page with no chat follows the link', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/design-system')
    expect(await page.locator('[data-chat-open]').count()).toBe(0)
    await page.locator('#proof .ds-claim-ask').first().click()
    await expect(page).toHaveURL(/#contact$/)
  })

  test('S3.2 FR-004 when the chat’s window can’t load, a sparkle goes to the contact section', async ({ page }) => {
    await fakeApi(page)
    await page.route(/\/_astro\/mount\./, (route) => route.abort())
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const [first] = await askers(page)
    await page
      .locator('[data-chat-ask]')
      .nth(first?.index ?? 0)
      .click()
    await expect(page).toHaveURL(/#contact$/)
    expect(await page.evaluate(`document.querySelector('dialog[data-chat-dialog]').open`)).toBe(false)
  })

  // Amended by spec 038 (D230): each sparkle is named for its claim's title, with its tooltip's words.
  test('S5.1 each sparkle is named for its claim', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const names = (await page.evaluate(
      `[...document.querySelectorAll('.ds-claim-ask')].map((a) => [a.getAttribute('aria-label'), a.textContent.trim()])`,
    )) as string[][]
    expect(names).toHaveLength(30)
    expect(new Set(names.map(([label]) => label)).size).toBe(30)
    for (const [label, text] of names) {
      expect(label).toMatch(/^Ask about this: .+/)
      expect(text).toBe('')
    }
  })

  test('S3.3 a modified click doesn’t open the chat', async ({ page }) => {
    await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await page
      .locator('[data-chat-ask]')
      .first()
      .click({ modifiers: ['Shift'] })
    await page.waitForTimeout(300)
    expect(await page.evaluate(`document.querySelector('dialog[data-chat-dialog]').open`)).toBe(false)
  })
})

test.describe('the button arrives once the hero has settled (story 4)', () => {
  const entrance = (page: Page) =>
    page.evaluate(`document.querySelector('[data-chat-open]').getAnimations().map((a) => ({
      name: a.animationName, delay: a.effect.getTiming().delay, duration: a.effect.getTiming().duration,
      easing: a.effect.getKeyframes()[0].easing, state: a.playState }))`) as Promise<
      { name: string; delay: number; duration: number; easing: string; state: string }[]
    >

  test('S4.1 SC-003 FR-005 on a desktop it rises on the spring and fades in, 420 ms from 1.8 s, once', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    expect(await entrance(page)).toEqual([
      expect.objectContaining({ name: 'chat-ask-rise', delay: 1800, duration: 420, easing: SPRING }),
      expect.objectContaining({ name: 'chat-ask-fade', delay: 1800, duration: 420, easing: EASE_OUT }),
    ])
    await page.waitForTimeout(2400)
    expect((await entrance(page)).filter((a) => a.state === 'running')).toEqual([])
  })

  test('S4.2 reduced motion, a phone and a deep link show it in place', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/')
    expect(await entrance(page)).toEqual([])
    await enter(page, { viewport: PHONE, theme: 'light' }, 'no-preference')
    await page.goto('/')
    expect(await entrance(page)).toEqual([])
    // From another page, so the deep link is a load, not a jump on the same page.
    await page.goto('/privacy')
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/#hopper')
    await page.waitForLoadState('load')
    expect((await entrance(page)).filter((a) => a.state === 'running')).toEqual([])
  })
})

test.describe('it still works for everyone (story 5)', () => {
  test('S5.3 SC-004 SC-005 FR-006 layout shift stays 0, the page loads only the one module, grown by at most 384 bytes', async ({
    page,
  }) => {
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/')
    await page.waitForTimeout(2400)
    // The load and the button's entrance shift nothing.
    expect(await page.evaluate('window.__shift')).toBe(0)
    const [first] = await askers(page)
    await tapAsker(page, first?.index ?? 0)
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    const size = (await (await page.request.get(src)).body()).length
    // Spec 031's Gate 1 allowance for the phone's corner button (D214): 768 bytes more.
    // Spec 032's Gate 1 allowance for the pill's flight (D215): 768 bytes more.
    // Spec 036 adds its own 384-byte allowance on Brad's Gate 1 card: the hero's live years.
    // Spec 038 adds none: the sparkles need no script, and the markers' numbering left the module.
    expect(size - MODULE_BEFORE).toBeLessThanOrEqual(ALLOWANCE + 768 + 768 + 384)
  })
})
