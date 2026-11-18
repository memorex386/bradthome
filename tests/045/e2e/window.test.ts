import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { VOICED } from '../../../apps/site/src/components/chat/fixtures.ts'
import type { Turn } from '../../../apps/site/src/components/chat/types.ts'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { askChat, dialogOf, fakeApi, openChat, type Reply } from '../../022/helpers/fake-api.ts'
import { watchShifts } from '../../036/helpers/e2e.ts'

// Spec 045's window, against spec 022's fake API in the pinned container: the
// pills, the hand-offs by state, the look, accessibility, motion and size.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const replyOf = (turn: Turn): Extract<Reply, { kind: 'answer' }> => ({
  kind: 'answer',
  text: turn.text,
  sources: [...turn.sources],
  ...(turn.meta === undefined ? {} : { meta: turn.meta }),
  ...(turn.next === undefined ? {} : { next: turn.next }),
})
const pills = (page: Page) => dialogOf(page).locator('.chat__pill')

async function asked(page: Page, replies: Reply[], question: string): Promise<Awaited<ReturnType<typeof fakeApi>>> {
  const api = await fakeApi(page, replies)
  await openHome(page)
  await openChat(page)
  await askChat(page, question)
  await expect(dialogOf(page).locator('.chat__turn').last()).toHaveAttribute('data-status', 'done')
  return api
}

test.describe('the pills (S2.5–S2.8, FR-007)', () => {
  test('S2.5 FR-007 the newest answer shows three pills under “Ask next”, each 44 px tall, and one sends itself', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    const api = await asked(page, [replyOf(VOICED.V2), replyOf(VOICED.V7)], VOICED.V2.question)
    const group = dialogOf(page).getByRole('group', { name: 'Ask next' })
    await expect(group).toBeVisible()
    await expect(pills(page)).toHaveText([...(VOICED.V2.next?.pills ?? [])])
    for (const pill of await pills(page).all()) expect((await pill.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
    await pills(page).nth(1).click()
    await expect(dialogOf(page).locator('.chat__turn')).toHaveCount(2)
    await expect(dialogOf(page).locator('.chat__question').last()).toContainText('What’s RemoteUI?')
    expect(api.posted.at(-1)?.messages.at(-1)?.parts[0]?.text).toBe('What’s RemoteUI?')
  })

  test('S2.6 once a newer question is asked, only its answer has pills', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await asked(page, [replyOf(VOICED.V2), replyOf(VOICED.V7)], VOICED.V2.question)
    await askChat(page, VOICED.V7.question)
    await expect(dialogOf(page).locator('.chat__turn').last()).toHaveAttribute('data-status', 'done')
    await expect(dialogOf(page).locator('.chat__next')).toHaveCount(1)
    await expect(dialogOf(page).locator('.chat__turn').last().locator('.chat__pill')).toHaveCount(3)
  })

  test('S2.6 a failed answer, or the chat at its limit, shows no pills', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await fakeApi(page, [{ kind: 'error' }])
    await openHome(page)
    await openChat(page)
    await askChat(page, 'What did Brad build at Hopper?')
    await expect(dialogOf(page).locator('.chat__turn')).toHaveAttribute('data-status', 'failed')
    await expect(pills(page)).toHaveCount(0)
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await asked(
      page,
      [replyOf(VOICED.V2), { kind: 'refuse', status: 429, body: { state: 'limit', resetsAt: '2026-11-19T00:00:00.000Z' } }],
      VOICED.V2.question,
    )
    await pills(page).first().click()
    await expect(dialogOf(page).locator('[data-off="limit"]')).toBeVisible()
    await expect(pills(page)).toHaveCount(0)
  })

  test('S2.5 S2.7 the pills are reached by Tab and sent with Enter, and the status counts them', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await asked(page, [replyOf(VOICED.V2), replyOf(VOICED.V7)], VOICED.V2.question)
    await expect(dialogOf(page).getByRole('status')).toHaveText('The answer is ready, with 2 sources and 3 questions to ask next.')
    await dialogOf(page).getByRole('button', { name: 'Inspect' }).focus()
    await page.keyboard.press('Tab')
    // Inspect opens nothing on Tab; the next stop is the first pill.
    await expect(pills(page).first()).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialogOf(page).locator('.chat__turn')).toHaveCount(2)
  })

  test('S2.8 Inspect shows the pills’ step', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await asked(page, [replyOf(VOICED.V7)], VOICED.V7.question)
    await dialogOf(page).getByRole('button', { name: 'Inspect' }).click()
    await expect(dialogOf(page).locator('.chat__steps')).toContainText('Checked the questions to ask next')
    await expect(dialogOf(page).locator('.chat__steps')).toContainText('2 written and checked, 1 from the starters')
  })

  test('S3.5 Inspect names the kind of reply', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await asked(page, [replyOf(VOICED.V3)], VOICED.V3.question)
    await dialogOf(page).getByRole('button', { name: 'Inspect' }).click()
    await expect(dialogOf(page).locator('.chat__steps')).toContainText('Kind of reply')
    await expect(dialogOf(page).locator('.chat__steps')).toContainText('Small talk, with no source')
  })

  test('S2.5 on a phone the pills wrap inside the window', async ({ page }) => {
    await enter(page, { viewport: { width: 320, height: 720 }, theme: 'light' })
    await asked(page, [replyOf(VOICED.V7)], VOICED.V7.question)
    const window = await dialogOf(page).boundingBox()
    for (const pill of await pills(page).all()) {
      const box = await pill.boundingBox()
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((window?.x ?? 0) + (window?.width ?? 0))
    }
  })
})

test.describe('the hand-offs by state (S3.1–S3.4, FR-008)', () => {
  test('S3.1 S3.2 S3.3 S3.4 FR-008 boundary, no-source, answered, chat, and chat with the address', async ({ page }) => {
    const states: [string, Reply, string | undefined][] = [
      ['boundary', { kind: 'boundary' }, 'Email Brad'],
      ['no-source', { kind: 'no-source' }, 'Email Brad the question'],
      ['answered', replyOf(VOICED.V2), undefined],
      ['chat', replyOf(VOICED.V3), undefined],
      [
        'chat with the address',
        { ...replyOf(VOICED.V3), text: 'Anytime! If something caught your eye, Brad’s at brad@bradthome.com.' },
        'Email Brad',
      ],
      // A cited answer that gives the address is still an answer, with no hand-off (S3.3).
      ['answered with the address', { ...replyOf(VOICED.V2), text: `${VOICED.V2.text} Brad’s at brad@bradthome.com.` }, undefined],
    ]
    for (const [name, reply, handoff] of states) {
      await enter(page, { viewport: DESKTOP, theme: 'light' })
      await asked(page, [reply], 'A question?')
      const links = dialogOf(page).locator('.chat__answer a.ds-button')
      if (handoff === undefined) await expect(links, name).toHaveCount(0)
      else await expect(links, name).toHaveText([handoff])
      await page.unrouteAll({ behavior: 'ignoreErrors' })
    }
  })
})

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`SC-002 SC-005 S6.3 the pills match their baseline with no violation at WCAG 2.2 AA, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await asked(page, [replyOf(VOICED.V2)], VOICED.V2.question)
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await expect(dialogOf(page).locator('.chat__turn').last()).toHaveScreenshot(`V2-turn-${size}-${theme}.png`)
      const results = await new AxeBuilder({ page }).include('dialog[data-chat-dialog]').withTags(TAGS).analyze()
      expect(results.violations.map((violation) => violation.id)).toEqual([])
    })
  }
}

test('S6.3 the pills shift no more layout than an answer without them, and with reduced motion they don’t move', async ({ page }) => {
  const shiftOf = async (next: Turn['next'] | null) => {
    await watchShifts(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await asked(page, [{ ...replyOf(VOICED.V2), next }], VOICED.V2.question)
    const shift = (await page.evaluate('window.__shift')) as number
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    return shift
  }
  const without = await shiftOf(null)
  const withPills = await shiftOf(VOICED.V2.next)
  expect(withPills).toBeLessThanOrEqual(without)
  const transition = await pills(page)
    .first()
    .evaluate(
      (element) =>
        (globalThis as unknown as { getComputedStyle(of: unknown): { transitionDuration: string } }).getComputedStyle(element)
          .transitionDuration,
    )
  expect(transition.split(',').every((each) => Number.parseFloat(each) === 0)).toBe(true)
})

test('S6.2 SC-004 the page still loads only the one module, 14,593 bytes', async ({ page }) => {
  await enter(page, { viewport: DESKTOP, theme: 'light' })
  await openHome(page)
  expect(await onlyPreviewScript(page)).toBe(true)
  const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
  expect((await (await page.request.get(src)).body()).length).toBe(14_593)
})
