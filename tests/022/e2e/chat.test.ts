import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { ANSWER, askChat, CHAT_API_ORIGIN, dialogOf, fakeApi, openChat, SOURCES } from '../helpers/fake-api.ts'

// Spec 022 in the browser: the window on the home, against the fake API.
// Stories 1–6 and 8. Every question goes to the fake, never the real API.

const BASE = 'http://127.0.0.1:5000'

async function home(page: Page, viewport: { width: number; height: number } = DESKTOP): Promise<void> {
  await enter(page, { viewport, theme: 'light' })
  await openHome(page)
}

test.describe('Story 1: opening the window', () => {
  test('S1.1 A1 A2 on a desktop the button is fixed in the corner, and opens a 440-pixel modal panel there with the box focused', async ({ page }) => {
    await fakeApi(page)
    await home(page)
    const button = page.locator('[data-chat-open]')
    await expect(button).toHaveAccessibleName('Ask about Brad')
    expect(await page.evaluate(`getComputedStyle(document.querySelector('[data-chat-open]')).position`)).toBe('fixed')
    const box = await button.boundingBox()
    expect(box!.x + box!.width).toBeGreaterThan(DESKTOP.width - 120)
    expect(box!.y + box!.height).toBeGreaterThan(DESKTOP.height - 100)
    await openChat(page)
    const panel = await dialogOf(page).boundingBox()
    expect(Math.round(panel!.width)).toBe(440)
    expect(panel!.x + panel!.width).toBeGreaterThan(DESKTOP.width - 80)
    expect(await page.evaluate(`document.querySelector('dialog[data-chat-dialog]').matches(':modal')`)).toBe(true)
    await expect(dialogOf(page).getByLabel('Your question')).toBeFocused()
    await expect(dialogOf(page).getByRole('button', { name: 'How does Brad ship with AI agents?' })).toBeVisible()
  })

  test('S1.2 A1 A2 on a phone the button sits in the hero, and opens a sheet that fills the screen', async ({ page }) => {
    await fakeApi(page)
    await home(page, PHONE)
    await expect(page.locator('.hero [data-chat-open]')).toHaveCount(1)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('[data-chat-open]')).position`)).toBe('static')
    await openChat(page)
    const sheet = await dialogOf(page).boundingBox()
    expect(sheet).toEqual({ x: 0, y: 0, width: PHONE.width, height: PHONE.height })
  })

  test('S1.3 Escape, the close button and the backdrop close it, focus returns to the button, and the conversation stays', async ({ page }) => {
    await fakeApi(page)
    await home(page)
    await openChat(page)
    await askChat(page, 'What did Brad build at Hopper?')
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialogOf(page)).toBeHidden()
    await expect(page.locator('[data-chat-open]')).toBeFocused()
    await openChat(page)
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
    await dialogOf(page).getByRole('button', { name: 'Close the chat' }).click()
    await expect(dialogOf(page)).toBeHidden()
    await openChat(page)
    await page.mouse.click(40, 40)
    await expect(dialogOf(page)).toBeHidden()
  })

  test("S1.4 FR-001 the page asks for neither the window's code nor the API until the button is pressed, then loads the code once", async ({ page }) => {
    const requested: string[] = []
    page.on('request', (request) => requested.push(request.url()))
    await fakeApi(page)
    await home(page)
    expect(requested.filter((url) => /\/_astro\/mount\.|\/_astro\/client\./.test(url) || url.startsWith(CHAT_API_ORIGIN))).toEqual([])
    await openChat(page)
    await page.keyboard.press('Escape')
    await openChat(page)
    expect(requested.filter((url) => /\/_astro\/mount\./.test(url))).toHaveLength(1)
    expect(requested.filter((url) => url.startsWith(CHAT_API_ORIGIN))).toEqual([])
  })

  test('S1.5 with JavaScript off, no button shows', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('[data-chat-open]')).toBeHidden()
    await expect(page.locator('#contact')).toBeVisible()
    await context.close()
  })
})

test.describe('Story 2: asking and the answer', () => {
  test('S2.1 a starter is asked as the question', async ({ page }) => {
    const api = await fakeApi(page)
    await home(page)
    await openChat(page)
    await dialogOf(page).getByRole('button', { name: 'What did Brad build at Hopper?' }).click()
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
    expect(api.posted[0]?.messages.at(-1)?.parts[0]?.text).toBe('What did Brad build at Hopper?')
    expect(api.posted[0]?.altcha.length).toBeGreaterThan(20)
  })

  test('S2.2 Enter sends, Shift+Enter adds a line, an empty question cannot be sent, and the box takes 1,000 characters', async ({ page }) => {
    const api = await fakeApi(page)
    await home(page)
    await openChat(page)
    const box = dialogOf(page).getByLabel('Your question')
    await expect(dialogOf(page).getByRole('button', { name: 'Send' })).toBeDisabled()
    await box.press('Enter')
    expect(api.posted).toHaveLength(0)
    await expect(box).toHaveAttribute('maxlength', '1000')
    await box.fill('First line')
    await box.press('Shift+Enter')
    await box.pressSequentially('second line')
    await expect(box).toHaveValue('First line\nsecond line')
    await box.press('Enter')
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
    expect(api.posted[0]?.messages.at(-1)?.parts[0]?.text).toBe('First line\nsecond line')
    await expect(box).toHaveValue('')
  })

  test('S2.3 K1 A3 it checks the browser first, then writes once the question is sent, each with Stop', async ({ page }) => {
    const api = await fakeApi(page, [{ kind: 'hold' }])
    api.challenge = 'hold'
    await home(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    const turn = dialogOf(page).locator('.chat__turn')
    await expect(turn).toHaveAttribute('data-status', 'checking')
    await expect(turn.getByText('Checking this browser')).toBeVisible()
    await expect(turn.getByRole('button', { name: 'Stop' })).toBeVisible()
    await page.unroute(`${CHAT_API_ORIGIN}/**`)
    const second = await fakeApi(page, [{ kind: 'hold' }])
    await turn.getByRole('button', { name: 'Stop' }).click()
    await expect(turn).toHaveAttribute('data-status', 'stopped')
    await askChat(page, 'What AI features has Brad shipped?')
    const writing = dialogOf(page).locator('.chat__turn').last()
    await expect(writing).toHaveAttribute('data-status', 'writing')
    await expect(writing.getByText('Writing the answer')).toBeVisible()
    expect(second.posted).toHaveLength(1)
  })

  test('S2.4 A4 the answer shows each source once, numbered in order and labelled, with Copy and Inspect', async ({ page }) => {
    await fakeApi(page, [{ kind: 'answer', sources: [...SOURCES, SOURCES[0]!] }])
    await home(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    const sources = dialogOf(page).getByRole('list', { name: 'Sources' }).getByRole('button')
    await expect(sources).toHaveText(SOURCES.map((source, n) => `${n + 1}${source.label}`))
    await expect(dialogOf(page).getByRole('button', { name: 'Copy' })).toBeVisible()
    await expect(dialogOf(page).getByRole('button', { name: 'Inspect' })).toBeVisible()
  })

  test('S2.5 Stop while writing cancels the request, keeps the question, and says it was stopped', async ({ page }) => {
    await fakeApi(page, [{ kind: 'hold' }])
    await home(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    const turn = dialogOf(page).locator('.chat__turn')
    await expect(turn).toHaveAttribute('data-status', 'writing')
    await turn.getByRole('button', { name: 'Stop' }).click()
    await expect(turn).toHaveAttribute('data-status', 'stopped')
    await expect(turn.getByText('You stopped this answer.')).toBeVisible()
    await expect(turn.getByText('What AI features has Brad shipped?')).toBeVisible()
  })

  test('S2.6 the next question carries the earlier question and answer, and leaves out a stopped one', async ({ page }) => {
    const api = await fakeApi(page, [{ kind: 'answer' }, { kind: 'hold' }, { kind: 'answer' }])
    await home(page)
    await openChat(page)
    await askChat(page, 'First?')
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
    await askChat(page, 'Second?')
    await dialogOf(page).locator('.chat__turn').last().getByRole('button', { name: 'Stop' }).click()
    await askChat(page, 'Third?')
    await expect.poll(() => api.posted.length).toBe(3)
    expect(api.posted[2]?.messages.map((message) => [message.role, message.parts[0]?.text])).toEqual([
      ['user', 'First?'],
      ['assistant', ANSWER],
      ['user', 'Third?'],
    ])
  })

  test('S2.7 Copy puts the answer and its numbered sources on the clipboard and says Copied', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await fakeApi(page)
    await home(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    await dialogOf(page).getByRole('button', { name: 'Copy' }).click()
    await expect(dialogOf(page).getByRole('button', { name: 'Copied' })).toBeVisible()
    const copied = await page.evaluate('navigator.clipboard.readText()')
    expect(copied).toBe([ANSWER, ...SOURCES.map((source, n) => `[${n + 1}] ${source.label}: ${source.url}`)].join('\n'))
  })
})

test.describe('Story 3: a source opened in place', () => {
  test("S3.1 S3.2 A5 a source opens with its words from /corpus.json and a link to its place here, and closes again", async ({ page }) => {
    const corpus: string[] = []
    page.on('request', (request) => {
      if (request.url().endsWith('/corpus.json')) corpus.push(request.url())
    })
    await fakeApi(page)
    await home(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    const first = dialogOf(page).getByRole('button', { name: SOURCES[0]!.label })
    await first.click()
    await expect(first).toHaveAttribute('aria-expanded', 'true')
    const opened = dialogOf(page).locator('.chat__opened')
    await expect(opened).toContainText('grounded streaming vehicle chat')
    await expect(opened.getByRole('link', { name: 'Open it on the site' })).toHaveAttribute('href', '/#side-vindecoded')
    await dialogOf(page).getByRole('button', { name: SOURCES[1]!.label }).click()
    await expect(opened).toContainText('Most new features reach production turned off')
    await opened.getByRole('button', { name: 'Close the source' }).click()
    await expect(opened).toHaveCount(0)
    expect(corpus).toHaveLength(1)
  })

  test("S3.3 when /corpus.json can't be read, the source says so and keeps its link", async ({ page }) => {
    await fakeApi(page)
    await page.route('**/corpus.json', (route) => route.fulfill({ status: 500, body: '' }))
    await home(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    await dialogOf(page).getByRole('button', { name: SOURCES[0]!.label }).click()
    const opened = dialogOf(page).locator('.chat__opened')
    await expect(opened).toContainText('This source couldn’t be loaded. Open it on the site instead.')
    await expect(opened.getByRole('link', { name: 'Open it on the site' })).toBeVisible()
  })
})

test.describe('Story 4: Inspect', () => {
  test('S4.1 S4.3 A6 Inspect shows the time, cost, model, sources, tools, tokens and IDs from the reply, and that nothing is stored', async ({ page }) => {
    await fakeApi(page)
    await home(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    const button = dialogOf(page).getByRole('button', { name: 'Inspect' })
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    const inspect = dialogOf(page).locator('.chat__inspect')
    await expect(inspect).toContainText('How this answer was made')
    await expect(inspect).toContainText('2.3 s · $0.0003')
    await expect(inspect.getByRole('list', { name: 'Model' })).toHaveText(['claude-haiku-5-5', '3 sources', '0 tools'].join(''))
    await expect(inspect).toContainText('20,725 tokens from the cache')
    await expect(inspect).toContainText('412 new tokens')
    await expect(inspect).toContainText('96 tokens')
    await expect(inspect).toContainText(SOURCES.map((source) => source.id).join(' · '))
    await expect(inspect).toContainText('Nothing about it is stored.')
    await expect(inspect.getByRole('link', { name: 'The code' })).toHaveAttribute('href', /github\.com\/memorex386\/bradthome/)
  })
})

test.describe('Story 5: no source and boundaries', () => {
  test("S5.1 A8 a no-source reply offers to email Brad the question", async ({ page }) => {
    await fakeApi(page, [{ kind: 'no-source' }])
    await home(page)
    await openChat(page)
    await askChat(page, 'Has Brad shipped anything in Rust?')
    const link = dialogOf(page).getByRole('link', { name: 'Email Brad the question' })
    await expect(link).toBeVisible()
    const href = new URL((await link.getAttribute('href')) ?? '')
    expect(href.pathname).toBe('brad@bradthome.com')
    expect(href.searchParams.get('body')).toBe('Has Brad shipped anything in Rust?')
  })

  test('S5.2 A9 a boundary reply offers to email Brad, with no question in it', async ({ page }) => {
    await fakeApi(page, [{ kind: 'boundary' }])
    await home(page)
    await openChat(page)
    await askChat(page, 'What salary is Brad looking for?')
    const link = dialogOf(page).getByRole('link', { name: 'Email Brad' })
    await expect(link).toBeVisible()
    expect(new URL((await link.getAttribute('href')) ?? '').searchParams.has('body')).toBe(false)
  })
})

test.describe('Story 6: limits, pauses and failures', () => {
  test("S6.1 A10 the visitor's limit says when it resets in their time, offers the PDF and email, and turns the box off", async ({ page }) => {
    await fakeApi(page, [{ kind: 'refuse', status: 429, body: { state: 'limit', message: 'x', resetsAt: '2026-11-09T00:00:00.000Z' } }])
    await home(page)
    await openChat(page)
    await askChat(page, 'One more?')
    const notice = dialogOf(page).getByRole('group', { name: 'That’s today’s limit for one visitor' })
    await expect(notice).toContainText('It resets at 12:00 AM your time.')
    await expect(notice.getByRole('link', { name: 'Download the résumé PDF' })).toHaveAttribute('href', /^\/resume\/.+\.pdf$/)
    await expect(notice.getByRole('link', { name: 'Email Brad' })).toHaveAttribute('href', /^mailto:brad@bradthome\.com/)
    await expect(dialogOf(page).getByLabel('Your question')).toBeDisabled()
  })

  for (const [scope, heading] of [
    ['day', 'The chat is resting today'],
    ['month', 'The chat is resting this month'],
    ['unknown', 'The chat is resting for now'],
  ] as const) {
    test(`S6.2 A11 a pause by ${scope} says so, offers the PDF and email, and turns the box off`, async ({ page }) => {
      await fakeApi(page, [{ kind: 'refuse', status: 503, body: { state: 'paused', scope, message: 'x' } }])
      await home(page)
      await openChat(page)
      await askChat(page, 'Anything?')
      const notice = dialogOf(page).getByRole('group', { name: heading })
      await expect(notice.getByRole('link', { name: 'Download the résumé PDF' })).toBeVisible()
      await expect(dialogOf(page).getByLabel('Your question')).toBeDisabled()
    })
  }

  test('S6.3 A12 a failed answer keeps the question, and Try again asks it again in place', async ({ page }) => {
    const api = await fakeApi(page, [{ kind: 'error' }, { kind: 'answer' }])
    await home(page)
    await openChat(page)
    await askChat(page, 'How does Brad test the AI features?')
    const failed = dialogOf(page).getByRole('group', { name: 'The answer didn’t finish' })
    await expect(failed).toBeVisible()
    await failed.getByRole('button', { name: 'Try again' }).click()
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
    await expect(dialogOf(page).locator('.chat__turn')).toHaveCount(1)
    expect(api.posted.map((body) => body.messages.at(-1)?.parts[0]?.text)).toEqual([
      'How does Brad test the AI features?',
      'How does Brad test the AI features?',
    ])
  })

  test("S6.4 K2 a challenge that can't be fetched fails the check, and Try again asks again", async ({ page }) => {
    const api = await fakeApi(page)
    api.challenge = 'fail'
    await home(page)
    await openChat(page)
    await askChat(page, 'What did Brad build at Hopper?')
    const failed = dialogOf(page).getByRole('group', { name: 'The check didn’t pass' })
    await expect(failed).toBeVisible()
    api.challenge = 'ok'
    await failed.getByRole('button', { name: 'Try again' }).click()
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
  })

  test('S6.4 K2 a refused solution fails the check too', async ({ page }) => {
    await fakeApi(page, [{ kind: 'refuse', status: 403, body: { state: 'altcha', message: 'x' } }])
    await home(page)
    await openChat(page)
    await askChat(page, 'What did Brad build at Hopper?')
    await expect(dialogOf(page).getByRole('group', { name: 'The check didn’t pass' })).toBeVisible()
  })

  test("S6.5 a refused origin says the chat isn't available here, and an unreadable question says so", async ({ page }) => {
    const api = await fakeApi(page, [{ kind: 'refuse', status: 400, body: { state: 'invalid', message: 'x' } }])
    await home(page)
    await openChat(page)
    await askChat(page, 'What?')
    await expect(dialogOf(page).locator('.chat__text', { hasText: 'That question couldn’t be read. Try a shorter one.' })).toBeVisible()
    api.challenge = 'origin'
    await askChat(page, 'And now?')
    await expect(dialogOf(page).locator('.chat__text', { hasText: 'This chat isn’t available here yet.' })).toBeVisible()
  })
})

test.describe('Story 8: private by design', () => {
  test('S8.1 FR-008 a conversation reaches only the site and the API, sets no cookie, and stores nothing', async ({ page, context }) => {
    const hosts = new Set<string>()
    page.on('request', (request) => hosts.add(new URL(request.url()).origin))
    await fakeApi(page)
    await home(page)
    await openChat(page)
    await askChat(page, 'What AI features has Brad shipped?')
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
    await dialogOf(page).getByRole('button', { name: SOURCES[0]!.label }).click()
    await expect(dialogOf(page).locator('.chat__opened')).toContainText('grounded')
    expect([...hosts].sort()).toEqual([BASE, CHAT_API_ORIGIN].sort())
    expect(await context.cookies()).toEqual([])
    expect(await page.evaluate('[localStorage.length, sessionStorage.length]')).toEqual([0, 0])
  })

  test('S8.2 nothing the window does writes a question or an answer to the console', async ({ page }) => {
    const logged: string[] = []
    page.on('console', (message) => logged.push(message.text()))
    await fakeApi(page)
    await home(page)
    await openChat(page)
    await askChat(page, 'A marked question, zebra-lantern?')
    await expect(dialogOf(page).getByText(ANSWER)).toBeVisible()
    expect(logged.filter((line) => /zebra-lantern|VINDecoded/.test(line))).toEqual([])
  })
})
