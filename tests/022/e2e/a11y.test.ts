import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { ANSWER, askChat, dialogOf, fakeApi, openChat, type Reply, SOURCES } from '../helpers/fake-api.ts'

// Spec 022, Story 7: the window at WCAG 2.2 AA in every state, on a phone and
// a desktop, in light and dark; the keyboard; what a screen reader hears; and
// reduced motion (FR-007, SC-004, D122).

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function violations(page: Page, include: string): Promise<string[]> {
  const results = await new AxeBuilder({ page }).include(include).withTags(TAGS).analyze()
  return results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`))
}

/** Each live state, reached through the fake API, then a step to reach it once the reply is in. */
const LIVE: { id: string; replies: Reply[]; challenge?: 'hold' | 'fail'; then?: (page: Page) => Promise<void> }[] = [
  { id: 'A2', replies: [] },
  { id: 'K1', replies: [{ kind: 'hold' }], challenge: 'hold' },
  { id: 'A3', replies: [{ kind: 'hold' }] },
  { id: 'A4', replies: [{ kind: 'answer' }] },
  {
    id: 'A5',
    replies: [{ kind: 'answer' }],
    then: async (page) => {
      await dialogOf(page).getByRole('button', { name: SOURCES[0]!.label }).click()
      await expect(dialogOf(page).locator('.chat__opened')).toContainText('grounded')
    },
  },
  { id: 'A6', replies: [{ kind: 'answer' }], then: (page) => dialogOf(page).getByRole('button', { name: 'Inspect' }).click() },
  { id: 'A8', replies: [{ kind: 'no-source' }] },
  { id: 'A9', replies: [{ kind: 'boundary' }] },
  { id: 'A10', replies: [{ kind: 'refuse', status: 429, body: { state: 'limit', resetsAt: '2026-11-09T00:00:00.000Z' } }] },
  { id: 'A11', replies: [{ kind: 'refuse', status: 503, body: { state: 'paused', scope: 'day' } }] },
  { id: 'A12', replies: [{ kind: 'error' }] },
  { id: 'K2', replies: [], challenge: 'fail' },
]

async function reach(page: Page, state: (typeof LIVE)[number]): Promise<void> {
  const api = await fakeApi(page, state.replies.length > 0 ? state.replies : undefined)
  if (state.challenge !== undefined) api.challenge = state.challenge
  await openHome(page)
  await openChat(page)
  if (state.id === 'A2') return
  await askChat(page, 'What AI features has Brad shipped?')
  const turn = dialogOf(page).locator('.chat__turn, .chat__notice').last()
  await turn.waitFor()
  if (state.id === 'K1') await expect(dialogOf(page).locator('.chat__turn')).toHaveAttribute('data-status', 'checking')
  if (state.id === 'A3') await expect(dialogOf(page).locator('.chat__turn')).toHaveAttribute('data-status', 'writing')
  if (['A4', 'A5', 'A6', 'A8', 'A9'].includes(state.id))
    await expect(dialogOf(page).locator('.chat__turn')).toHaveAttribute('data-status', 'done')
  await state.then?.(page)
}

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`S7.1 SC-004 FR-007 every state of the window has no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({ page }) => {
      test.setTimeout(180_000)
      for (const state of LIVE) {
        await enter(page, { viewport, theme })
        await reach(page, state)
        expect(await violations(page, 'dialog[data-chat-dialog]'), state.id).toEqual([])
        await page.unrouteAll({ behavior: 'ignoreErrors' })
      }
      await enter(page, { viewport, theme })
      await openHome(page)
      expect(await violations(page, '[data-chat-open]'), 'A1').toEqual([])
    })
  }

  test(`S7.1 S10.1 the gallery's held states have no violation at WCAG 2.2 AA, ${theme}`, async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme })
    await page.goto('/design-system#chat')
    expect(await violations(page, '#chat')).toEqual([])
  })
}

test('S7.2 every control is reached by the keyboard in order, focus shows, and it stays in the window', async ({ page }) => {
  await fakeApi(page)
  await enter(page, { viewport: DESKTOP, theme: 'light' })
  await openHome(page)
  await page.locator('[data-chat-open]').focus()
  await page.keyboard.press('Enter')
  await expect(dialogOf(page).getByLabel('Your question')).toBeFocused()
  await page.keyboard.type('What AI features has Brad shipped?')
  await page.keyboard.press('Enter')
  await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
  const reached: string[] = []
  for (let i = 0; i < 16; i += 1) {
    await page.keyboard.press('Tab')
    // The focused control: inside the open dialog, its name, and its ring (the field's, for the box).
    const focus = (await page.evaluate(`(() => {
      const element = document.activeElement
      // Past the last control, focus leaves for the browser's own controls, which the page sees as the body; it never reaches the page behind.
      if (element === null || element === document.body) return { inside: true, name: '', ring: 'none' }
      const field = element.closest('.chat__field')
      return {
        inside: element.closest('dialog[open]') !== null,
        name: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
        ring: field !== null && element.tagName === 'TEXTAREA' ? getComputedStyle(field).outlineStyle : getComputedStyle(element).outlineStyle,
      }
    })()`)) as { inside: boolean; name: string; ring: string }
    if (focus.name === '') continue
    expect(focus.inside, focus.name).toBe(true)
    expect(focus.ring, focus.name).not.toBe('none')
    reached.push(focus.name)
  }
  for (const name of ['Close the chat', 'Copy', 'Inspect']) expect(reached).toContain(name)
  expect(reached.some((name) => name.includes(SOURCES[0]!.label))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-chat-open]')).toBeFocused()
})

test('S7.3 a screen reader hears a dialog named Ask about Brad, a labelled box, and a polite status at each step', async ({ page }) => {
  await fakeApi(page)
  await enter(page, { viewport: DESKTOP, theme: 'light' })
  await openHome(page)
  await openChat(page)
  await expect(page.getByRole('dialog', { name: 'Ask about Brad' })).toBeVisible()
  await expect(dialogOf(page).getByRole('textbox', { name: 'Your question' })).toBeVisible()
  const status = dialogOf(page).getByRole('status')
  await expect(status).toHaveAttribute('aria-live', 'polite')
  await askChat(page, 'What AI features has Brad shipped?')
  await expect(status).toHaveText('The answer is ready, with 3 sources.')
  // The stream is read once, as the answer, never word by word.
  await expect(dialogOf(page).locator('[aria-live] .chat__text')).toHaveCount(0)
})

test('S7.4 D122 with reduced motion nothing in the window moves; without it, the window rises and the spinner turns', async ({ page }) => {
  for (const motion of ['reduce', 'no-preference'] as const) {
    const api = await fakeApi(page, [{ kind: 'hold' }])
    api.challenge = 'hold'
    await enter(page, { viewport: DESKTOP, theme: 'light' }, motion)
    await openHome(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    await expect(dialogOf(page).locator('.chat__turn')).toHaveAttribute('data-status', 'checking')
    const moving = (await page.evaluate('document.getAnimations().length')) as number
    if (motion === 'reduce') expect(moving).toBe(0)
    else expect(moving).toBeGreaterThan(0)
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  }
})
