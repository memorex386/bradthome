import { expect, type Page, test } from '@playwright/test'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { dialogOf, fakeApi } from '../../022/helpers/fake-api.ts'

// Spec 030 in the browser: "Ask me" opens Ask about Brad with its claim's
// question in the box, unsent; the links that stay links; the receipt cases
// against the built page's questions; and MA-20 (D213). Every question goes
// to spec 022's fake API, never the real one.

// The one module before this slice (spec 029's build), and Brad's Gate 1 allowance.
const MODULE_BEFORE = 11049
const ALLOWANCE = 384
const SPRING = 'cubic-bezier(0.3, 1.32, 0.52, 1)'
const EASE_OUT = 'cubic-bezier(0.2, 0.7, 0.2, 1)'

const box = (page: Page) => dialogOf(page).getByLabel('Your question')

/** Every element on the page that hands the chat a question, as its id-able handle and its question. */
const askers = (page: Page): Promise<{ index: number; question: string; row: boolean }[]> =>
  page.evaluate(
    `[...document.querySelectorAll('[data-chat-ask]')].map((a, index) => ({ index, question: a.dataset.chatAsk, row: a.classList.contains('ds-receipts__ask') }))`,
  ) as Promise<{ index: number; question: string; row: boolean }[]>

/** Opens the asker's drawer, as a visitor would, and taps it. */
async function tapAsker(page: Page, index: number): Promise<void> {
  await page.evaluate(`document.querySelectorAll('[data-chat-ask]')[${index}].closest('details').open = true`)
  await page.locator('[data-chat-ask]').nth(index).click()
  await box(page).waitFor()
}

test.describe('"Ask me" asks about its claim (story 1)', () => {
  test('S1.1 S1.2 S1.5 SC-001 FR-001 every "Ask me" and drawer link on / opens the chat with its question, unsent, and focus returns', async ({
    page,
  }) => {
    const api = await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const all = await askers(page)
    // Amended by spec 034 (D219): the Mobile card's two new claims ask.
    expect(all.filter((a) => a.row)).toHaveLength(20)
    expect(all.filter((a) => !a.row)).toHaveLength(10)
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

  test('S1.4 a second "Ask me", after an answer or from Prep, replaces the box in Ask mode and keeps the conversation', async ({
    page,
  }) => {
    await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const all = await askers(page)
    const [one, two] = all.filter((a) => a.row)
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
  test('S2.1 SC-002 FR-003 the suite’s receipt cases are exactly the built page’s questions, on / and each role page', async ({ page }) => {
    const cases = CASES.filter((c) => c.id.startsWith('facts-receipt')).map((c) => c.question)
    for (const address of ['/', '/mobile', '/fullstack', '/ai']) {
      await page.goto(address)
      const questions = [...new Set((await askers(page)).map((a) => a.question))]
      expect(questions.sort(), address).toEqual([...cases].sort())
    }
  })
})

test.describe('without the chat, "Ask me" still reaches Brad (story 3)', () => {
  test.describe('with no script', () => {
    test.use({ javaScriptEnabled: false })

    test('S3.1 FR-004 each "Ask me" and drawer link goes to the contact section', async ({ page }) => {
      await enter(page, { viewport: PHONE, theme: 'light' })
      await page.goto('/')
      const hrefs = await page.evaluate(
        `[...new Set([...document.querySelectorAll('[data-chat-ask]')].map((a) => a.getAttribute('href')))]`,
      )
      expect(hrefs).toEqual(['#contact'])
      await page.locator('.hopper__topic details summary').first().click()
      await page.locator('.hopper__topic [data-chat-ask]').first().click()
      await expect(page).toHaveURL(/#contact$/)
    })
  })

  test('S3.2 a page with no chat follows the link', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/design-system')
    expect(await page.locator('[data-chat-open]').count()).toBe(0)
    const link = page.locator('[data-chat-ask]').first()
    await page.evaluate(`document.querySelector('[data-chat-ask]').closest('details').open = true`)
    await link.click()
    await expect(page).toHaveURL(/#contact$/)
  })

  test('S3.2 FR-004 when the chat’s window can’t load, "Ask me" goes to the contact section', async ({ page }) => {
    await fakeApi(page)
    await page.route(/\/_astro\/mount\./, (route) => route.abort())
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const [first] = await askers(page)
    await page.evaluate(`document.querySelectorAll('[data-chat-ask]')[${first?.index ?? 0}].closest('details').open = true`)
    await page
      .locator('[data-chat-ask]')
      .nth(first?.index ?? 0)
      .click()
    await expect(page).toHaveURL(/#contact$/)
    expect(await page.evaluate(`document.querySelector('dialog[data-chat-dialog]').open`)).toBe(false)
  })

  test('S5.1 each "Ask me" is named for its receipt', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const names = await page.evaluate(
      `[...document.querySelectorAll('.ds-receipts__ask')].map((a) => [a.getAttribute('aria-label'), a.closest('li').querySelector('.ds-marker').textContent.trim(), a.textContent.trim()])`,
    )
    // Amended by spec 034 (D219).
    expect((names as string[][]).length).toBe(20)
    for (const [label, n, text] of names as string[][]) {
      expect(label).toBe(`Ask me about receipt ${n}`)
      expect(text).toBe('Ask me')
    }
  })

  test('S3.3 a modified click doesn’t open the chat', async ({ page }) => {
    await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    await page.evaluate(`document.querySelectorAll('[data-chat-ask]')[0].closest('details').open = true`)
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
    // The load and the button's entrance shift nothing; opening a drawer is the visitor's own change.
    expect(await page.evaluate('window.__shift')).toBe(0)
    const [first] = await askers(page)
    await tapAsker(page, first?.index ?? 0)
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    const size = (await (await page.request.get(src)).body()).length
    // Spec 031's Gate 1 allowance for the phone's corner button (D214): 768 bytes more.
    // Spec 032's Gate 1 allowance for the pill's flight (D215): 768 bytes more.
    expect(size - MODULE_BEFORE).toBeLessThanOrEqual(ALLOWANCE + 768 + 768)
  })
})
