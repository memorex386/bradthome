import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { EXAMPLE_POSTING } from '../../../apps/site/src/components/chat/example.ts'
import { HELD_PREP } from '../../../apps/site/src/components/chat/prep-fixtures.ts'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { askChat } from '../../022/helpers/fake-api.ts'
import {
  dialogOf,
  fakePrep,
  mapPosting,
  modeOf,
  NO_FIT_ANSWER,
  NOT_POSTING_ANSWER,
  openPrep,
  PREP_ANSWER,
  type PrepReply,
  ROLE_ANSWER,
} from '../helpers/fake-prep.ts'

// Spec 024 in the browser: interview prep in the window on the home, against
// the fake API, and its held states in the gallery. Every request goes to the
// fake, never the real API.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const POSTING = 'Senior Engineer, Partner Launches. Launch partner flows end to end, and run Go on Kubernetes.'

async function home(page: Page, viewport: { width: number; height: number } = DESKTOP): Promise<void> {
  await enter(page, { viewport, theme: 'light' })
  await openHome(page)
}

test.describe('Story 1: switching to prep', () => {
  test('S1.1 a Mode group holds Ask and Interview prep, Ask pressed; pressing prep shows P1 with the posting box focused', async ({
    page,
  }) => {
    await fakePrep(page)
    await home(page)
    await page.locator('[data-chat-open]').click()
    const modes = dialogOf(page).getByRole('group', { name: 'Mode' })
    await expect(modes.getByRole('button', { name: 'Ask', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(modes.getByRole('button', { name: 'Interview prep' })).toHaveAttribute('aria-pressed', 'false')
    await modes.getByRole('button', { name: 'Interview prep' }).click()
    await expect(modes.getByRole('button', { name: 'Interview prep' })).toHaveAttribute('aria-pressed', 'true')
    await expect(dialogOf(page).getByLabel('Job description')).toBeFocused()
  })

  test('S1.2 the welcome invites an interviewer to switch, and its button does', async ({ page }) => {
    await fakePrep(page)
    await home(page)
    await page.locator('[data-chat-open]').click()
    await expect(dialogOf(page).locator('.chat__welcome-prep')).toContainText('Interviewing Brad?')
    await dialogOf(page).locator('.chat__welcome-prep').getByRole('button', { name: 'Interview prep' }).click()
    await expect(dialogOf(page).getByLabel('Job description')).toBeVisible()
  })

  test('S1.3 S1.4 each mode keeps what it showed, across switching and closing', async ({ page }) => {
    await fakePrep(page)
    await home(page)
    await page.locator('[data-chat-open]').click()
    await askChat(page, 'What AI features has Brad shipped?')
    await expect(dialogOf(page).locator('.chat__turn')).toHaveAttribute('data-status', 'done')
    await modeOf(page, 'Interview prep').click()
    await dialogOf(page).getByLabel('Job description').fill(POSTING)
    await modeOf(page, 'Ask').click()
    await expect(dialogOf(page).locator('.chat__turn')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await page.locator('[data-chat-open]').click()
    // It reopens in Ask, where it was left, and prep still holds the posting.
    await expect(modeOf(page, 'Ask')).toHaveAttribute('aria-pressed', 'true')
    await modeOf(page, 'Interview prep').click()
    await expect(dialogOf(page).getByLabel('Job description')).toHaveValue(POSTING)
  })
})

test.describe('Story 2: a posting or a role', () => {
  test('S2.1 S2.5 the count updates, the note says it isn’t stored, and Map Brad to this role sends the posting in the body only', async ({
    page,
  }) => {
    const api = await fakePrep(page)
    await home(page)
    await openPrep(page)
    await expect(dialogOf(page).getByText('The posting is used for this answer only, and never stored.')).toBeVisible()
    await dialogOf(page).getByLabel('Job description').fill(POSTING)
    await expect(dialogOf(page).locator('.prep__count')).toHaveText('15 of 3,000 words')
    await dialogOf(page).getByRole('button', { name: 'Map Brad to this role' }).click()
    await expect(dialogOf(page).locator('[data-prep="answered"]')).toBeVisible()
    expect(api.prepped).toHaveLength(1)
    expect(api.prepped[0]?.posting).toBe(POSTING)
    expect(api.prepped[0]?.altcha).not.toBe('')
    // S6.2: nothing of the posting in the address.
    expect(api.urls.every((url) => !url.includes('Partner'))).toBe(true)
  })

  test('S2.2 a role typed in the question box is sent with Enter', async ({ page }) => {
    const api = await fakePrep(page, [{ kind: 'answer', answer: ROLE_ANSWER }])
    await home(page)
    await openPrep(page)
    const box = dialogOf(page).getByLabel('A role’s name')
    await expect(box).toHaveAttribute('placeholder', 'Or name a role, like “staff mobile engineer”')
    await box.fill('Staff Android engineer')
    await box.press('Enter')
    await expect(dialogOf(page).getByText('Typical requirements for this role, inferred from its name')).toBeVisible()
    expect(api.prepped[0]?.posting).toBe('Staff Android engineer')
  })

  test('S2.3 S2.4 P5 a posting over 3,000 words, or a blank one, isn’t sent; trimmed, it is', async ({ page }) => {
    const api = await fakePrep(page)
    await home(page)
    await openPrep(page)
    const button = dialogOf(page).getByRole('button', { name: 'Map Brad to this role' })
    await expect(button).toHaveAttribute('aria-disabled', 'true')
    await button.click({ force: true })
    const long = Array.from({ length: 3_001 }, () => 'word').join(' ')
    await dialogOf(page).getByLabel('Job description').fill(long)
    await expect(dialogOf(page).locator('.prep__count')).toContainText('That’s 3,001 words. Prep reads up to 3,000')
    await expect(dialogOf(page).getByLabel('Job description')).toHaveAttribute('aria-invalid', 'true')
    await button.click({ force: true })
    await dialogOf(page).getByLabel('Job description').press('Control+Enter')
    expect(api.prepped).toHaveLength(0)
    // Within 3,000 words but over 24,000 characters is too long as well (FR-002).
    await dialogOf(page).getByLabel('Job description').fill('x'.repeat(24_001))
    await expect(dialogOf(page).locator('.prep__count')).toContainText('reads up to 24,000 characters')
    await button.click({ force: true })
    expect(api.prepped).toHaveLength(0)
    await dialogOf(page).getByLabel('Job description').fill(long.slice(0, -5))
    await button.click()
    await expect(dialogOf(page).locator('[data-prep="answered"]')).toBeVisible()
    expect(api.prepped).toHaveLength(1)
  })
})

test.describe('Story 3: working through it', () => {
  test('S3.1 S3.2 P2 shows the posting’s count and the four steps', async ({ page }) => {
    await fakePrep(page, [{ kind: 'hold' }])
    await home(page)
    await openPrep(page)
    await mapPosting(page, POSTING)
    await expect(dialogOf(page).locator('.prep__chip')).toHaveText('Job description · 15 words')
    const steps = dialogOf(page).getByRole('list', { name: 'Progress' }).locator('li')
    await expect(steps).toHaveCount(4)
    await expect(steps.nth(0)).toHaveAttribute('data-step', 'active')
    await expect(steps.nth(3)).toHaveText('Writing questions to ask Brad')
  })

  test('S3.3 Stop returns to P1 with the posting kept', async ({ page }) => {
    await fakePrep(page, [{ kind: 'hold' }])
    await home(page)
    await openPrep(page)
    await mapPosting(page, POSTING)
    await dialogOf(page).getByRole('button', { name: 'Stop' }).click()
    await expect(dialogOf(page).getByLabel('Job description')).toHaveValue(POSTING)
    await expect(dialogOf(page).getByRole('status')).toHaveText('You stopped it. The posting is kept.')
  })
})

test.describe('Story 4: the result', () => {
  test('S4.1 S4.2 P3 shows the role, k of n matches with their sources, the gaps and the questions', async ({ page }) => {
    await fakePrep(page)
    await home(page)
    await openPrep(page)
    await mapPosting(page, POSTING)
    const result = dialogOf(page).locator('[data-prep="answered"]')
    await expect(result.locator('.prep__chip')).toHaveText(PREP_ANSWER.role)
    await expect(result.getByRole('heading', { name: 'Strong matches · 5 of 8' })).toBeVisible()
    await expect(result.locator('.prep__match')).toHaveCount(PREP_ANSWER.matches.length)
    const link = result.getByRole('link', { name: 'Essay · New features ship dark' })
    await expect(link).toHaveAttribute('href', '/vindecoded-agents#new-features-ship-dark')
    await expect(result.locator('.prep__gap')).toHaveText(PREP_ANSWER.gaps)
    await expect(result.locator('.prep__questions li')).toHaveText(PREP_ANSWER.questions)
  })

  test('S4.4 S4.5 S4.6 Copy as notes, Email Brad with no posting, Inspect and Map another role', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await fakePrep(page)
    await home(page)
    await openPrep(page)
    await mapPosting(page, POSTING)
    await dialogOf(page).getByRole('button', { name: 'Copy as notes' }).click()
    await expect(dialogOf(page).getByRole('button', { name: 'Copied' })).toBeVisible()
    const notes = await page.evaluate('navigator.clipboard.readText()')
    expect(notes).toContain('Strong matches (5 of 8)')
    expect(notes).toContain('Gaps, honestly')
    expect(notes).toContain('https://bradthome.com/vindecoded-agents#new-features-ship-dark')
    const email = dialogOf(page).getByRole('link', { name: 'Email Brad' })
    expect(await email.getAttribute('href')).toMatch(/^mailto:brad@bradthome\.com\?subject=/)
    expect(await email.getAttribute('href')).not.toContain('Partner')
    await dialogOf(page).getByRole('button', { name: 'Inspect' }).click()
    await expect(dialogOf(page).locator('.chat__inspect')).toContainText('claude-haiku-5-5')
    await dialogOf(page).getByRole('button', { name: 'Map another role' }).click()
    await expect(dialogOf(page).getByLabel('Job description')).toHaveValue('')
    await expect(dialogOf(page).getByLabel('Job description')).toBeFocused()
  })

  test('S4.7 P6 no fit shows the gaps, Email Brad and Map another role', async ({ page }) => {
    await fakePrep(page, [{ kind: 'answer', answer: NO_FIT_ANSWER }])
    await home(page)
    await openPrep(page)
    await mapPosting(page, POSTING)
    const result = dialogOf(page).locator('[data-prep="no-fit"]')
    await expect(result).toContainText('The site’s facts don’t show the experience this role asks for.')
    await expect(result.locator('.prep__gap')).toHaveCount(NO_FIT_ANSWER.gaps.length)
    await expect(result.getByRole('link', { name: 'Email Brad' })).toBeVisible()
  })

  test('S4.8 P4 text that isn’t a posting asks for one, and the example fills the box', async ({ page }) => {
    await fakePrep(page, [{ kind: 'answer', answer: NOT_POSTING_ANSWER }])
    await home(page)
    await openPrep(page)
    await mapPosting(page, 'Brad Thome')
    await expect(dialogOf(page).getByText('That doesn’t look like a job description.')).toBeVisible()
    await dialogOf(page).getByRole('button', { name: 'Use an example posting' }).click()
    await expect(dialogOf(page).getByLabel('Job description')).toHaveValue(EXAMPLE_POSTING)
  })
})

test.describe('limits, pauses and failures', () => {
  const cases: { id: string; reply: PrepReply; challenge?: 'fail'; text: string }[] = [
    {
      id: 'PL',
      reply: { kind: 'refuse', status: 429, body: { state: 'limit', left: 2, resetsAt: '2026-11-09T00:00:00.000Z' } },
      text: 'Prep needs 3 of today’s questions',
    },
    {
      id: 'A10',
      reply: { kind: 'refuse', status: 429, body: { state: 'limit', left: 0, resetsAt: '2026-11-09T00:00:00.000Z' } },
      text: 'That’s today’s limit for one visitor',
    },
    { id: 'A11', reply: { kind: 'refuse', status: 503, body: { state: 'paused', scope: 'day' } }, text: 'The chat is resting today' },
    { id: 'A12', reply: { kind: 'error' }, text: 'The answer didn’t finish' },
    { id: 'K2', reply: { kind: 'answer' }, challenge: 'fail', text: 'The check didn’t pass' },
  ]
  for (const item of cases) {
    test(`S5.3 S5.8 FR-005 ${item.id} shows in prep's view`, async ({ page }) => {
      const api = await fakePrep(page, [item.reply])
      if (item.challenge !== undefined) api.challenge = item.challenge
      await home(page)
      await openPrep(page)
      await mapPosting(page, POSTING)
      // Prep's own view; the chat's hidden view and the status line say the same words.
      await expect(dialogOf(page).locator('.chat__log--prep').getByText(item.text, { exact: true })).toBeVisible()
      if (item.id === 'PL') {
        // Ask still works with 2 left.
        await dialogOf(page).locator('[data-off="prep-limit"]').getByRole('button', { name: 'Ask', exact: true }).click()
        await expect(dialogOf(page).getByLabel('Your question')).not.toHaveAttribute('aria-disabled', 'true')
      }
      if (item.id === 'A12' || item.id === 'K2') {
        await expect(dialogOf(page).locator('.prep__chip')).toHaveText('Job description · 15 words')
        await expect(dialogOf(page).getByRole('button', { name: 'Try again' })).toBeVisible()
      }
    })
  }
})

test('S6.3 FR-008 prep stores nothing in the browser and sends nothing but the API request', async ({ page }) => {
  await fakePrep(page)
  const hosts = new Set<string>()
  page.on('request', (request) => hosts.add(new URL(request.url()).origin))
  await home(page)
  await openPrep(page)
  await mapPosting(page, POSTING)
  await expect(dialogOf(page).locator('[data-prep="answered"]')).toBeVisible()
  const stored = (await page.evaluate(
    'JSON.stringify([document.cookie, Object.keys(localStorage), Object.keys(sessionStorage)])',
  )) as string
  expect(stored).toBe('["",[],[]]')
  expect([...hosts].filter((origin) => !origin.startsWith('http://127.0.0.1') && !origin.includes('run.app'))).toEqual([])
})

test.describe('Story 8: accessible', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`S8.1 FR-007 SC-001 the gallery's held prep states have no violation at WCAG 2.2 AA, ${theme}`, async ({ page }) => {
      await enter(page, { viewport: DESKTOP, theme })
      await page.goto('/design-system#prep')
      const results = await new AxeBuilder({ page }).include('#prep').withTags(TAGS).analyze()
      expect(results.violations.flatMap((v) => v.nodes.map((node) => `${v.id} at ${node.target.join(' ')}`))).toEqual([])
    })
  }

  test('S8.1 prep in the window, on a phone, has no violation at its entry and its result', async ({ page }) => {
    await fakePrep(page)
    await home(page, PHONE)
    await openPrep(page)
    for (const step of ['entry', 'result']) {
      if (step === 'result') await mapPosting(page, POSTING)
      const results = await new AxeBuilder({ page }).include('dialog[data-chat-dialog]').withTags(TAGS).analyze()
      expect(
        results.violations.map((v) => v.id),
        step,
      ).toEqual([])
    }
  })

  test('S8.2 the keyboard reaches the switch, the box, Map and every result control, with focus showing', async ({ page }) => {
    await fakePrep(page)
    await home(page)
    await page.locator('[data-chat-open]').focus()
    await page.keyboard.press('Enter')
    const names: string[] = []
    const tab = async (times: number) => {
      for (let i = 0; i < times; i += 1) {
        await page.keyboard.press('Tab')
        const focus = (await page.evaluate(`(() => {
          const el = document.activeElement
          if (el === null || el === document.body) return { name: '', ring: 'none' }
          return { name: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '', ring: getComputedStyle(el).outlineStyle }
        })()`)) as { name: string; ring: string }
        if (focus.name !== '') {
          names.push(focus.name)
          expect(focus.ring, focus.name).not.toBe('none')
        }
      }
    }
    // From the close button, Tab reaches the switch next.
    await dialogOf(page).getByRole('button', { name: 'Close the chat' }).focus()
    await tab(2)
    expect(names).toEqual(['Ask', 'Interview prep'])
    await page.keyboard.press('Enter')
    await expect(dialogOf(page).getByLabel('Job description')).toBeFocused()
    await page.keyboard.type(POSTING)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(dialogOf(page).locator('[data-prep="answered"]')).toBeVisible()
    names.length = 0
    await dialogOf(page).locator('[data-prep="answered"] .prep__chip').click()
    await tab(14)
    for (const name of ['Copy as notes', 'Email Brad', 'Inspect', 'Map another role']) expect(names).toContain(name)
  })

  test('S8.3 the mode buttons say which is pressed, the box is described by its count, and the status says when the fit is ready', async ({
    page,
  }) => {
    await fakePrep(page)
    await home(page)
    await openPrep(page)
    const box = dialogOf(page).getByRole('textbox', { name: 'Job description' })
    await box.fill(POSTING)
    await expect(box).toHaveAccessibleDescription('15 of 3,000 words')
    await dialogOf(page).getByRole('button', { name: 'Map Brad to this role' }).click()
    await expect(dialogOf(page).getByRole('status')).toHaveText('The fit is ready, with 5 matches.')
    await expect(dialogOf(page).locator('[aria-live] .prep__step')).toHaveCount(0)
  })

  test('S8.4 D122 with reduced motion nothing in prep moves', async ({ page }) => {
    await fakePrep(page, [{ kind: 'hold' }])
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'reduce')
    await openHome(page)
    await openPrep(page)
    await mapPosting(page, POSTING)
    await dialogOf(page).locator('.prep__steps').waitFor()
    const moving = (await page.evaluate(`[...document.querySelectorAll('dialog[data-chat-dialog] *')].filter((el) => {
      const style = getComputedStyle(el)
      return style.animationName !== 'none' || (style.transitionDuration !== '0s' && style.transitionProperty !== 'none' && style.transitionDuration.split(',').some((d) => parseFloat(d) > 0))
    }).map((el) => el.className)`)) as string[]
    expect(moving).toEqual([])
  })
})

for (const theme of ['light', 'dark'] as const) {
  for (const [size, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`SC-001 every held prep state in the gallery matches its baseline, ${size} ${theme}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await page.goto('/design-system#prep')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      for (const state of HELD_PREP) {
        await expect(page.locator(`#prep-${state.id.toLowerCase()} .chat-frame`), state.id).toHaveScreenshot(
          `${state.id}-${size}-${theme}.png`,
        )
      }
    })
  }
}
