import { createHash } from 'node:crypto'
import { expect, type Page, test } from '@playwright/test'
import { contrast, DESKTOP, enter, NARROW, openHome, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { dialogOf, fakeApi } from '../../022/helpers/fake-api.ts'
import { watchShifts } from '../../036/helpers/e2e.ts'

// Spec 038 in the browser: proof on the card at rest, the sparkle that asks
// about each claim, every link to a claim still landing on it, and the motion
// (D229, D230). Playwright asks for reduced motion by default; the motion
// tests ask for no-preference. Every question goes to spec 022's fake API.

const PAGES = ['/', '/mobile', '/fullstack', '/ai'] as const
const WIDTHS = [NARROW, { width: 375, height: 812 }, PHONE, DESKTOP, { width: 1440, height: 900 }] as const
const SITE = 'https://bradthome.com'

/** The 13 distinct public sources of the home's claims (spec 038's summary). */
const SOURCES = [
  'https://yourmileagemayvary.com/2024/07/22/how-to-beat-deltas-meltdown-with-capital-ones-flight-disruption-assistance/',
  'https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one',
  'https://play.google.com/store/apps/details?id=com.bleacherreport.android.teamstream',
  'https://vindecoded.com/',
  'https://play.google.com/store/apps/details?id=com.mtsdealersolutions.vindecoded',
  'https://apps.apple.com/us/app/vindecoded/id1191483515',
  'https://bradthome.com/vindecoded-agents',
  'https://sudokuworld.app/',
  'https://github.com/memorex386/bradthome',
  'https://bradthome.com/design-system',
  'https://github.com/memorex386/bradthome/blob/main/docs/working-agreement.md',
  'https://github.com/memorex386/bradthome/blob/main/docs/releases/v2.5.0.md',
  'https://bradthome.com/evals',
] as const

const RGB = {
  accent: { light: 'rgb(42, 85, 229)', dark: 'rgb(142, 168, 255)' },
  accentSoft: { light: 'rgb(234, 240, 254)', dark: 'rgb(28, 36, 64)' },
  bandAccent: 'rgb(142, 168, 255)',
  bandFlash: 'rgba(142, 168, 255, 0.16)',
} as const

/** A computed style of the first element a selector matches, or of one of its pseudo-elements. */
const styleOf = (page: Page, selector: string, property: string, pseudo?: '::before' | '::after'): Promise<string> =>
  page.evaluate(
    `getComputedStyle(document.querySelector(${JSON.stringify(selector)}), ${JSON.stringify(pseudo ?? null)}).getPropertyValue(${JSON.stringify(property)})`,
  ) as Promise<string>

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** Each card's listed sources, by the card's id or its topic's heading id. */
const listsOf = (page: Page) =>
  page.evaluate(`[...document.querySelectorAll('main .ds-sources')].map((list) => {
    const card = list.closest('article, li.hopper__topic, header')
    const key = card.id || card.querySelector('h3')?.id || card.className
    return { key, label: list.querySelector('.ds-sources__label').textContent.trim(), named: list.querySelector('ul').getAttribute('aria-labelledby') === list.querySelector('.ds-sources__label').id,
      links: [...list.querySelectorAll('a.ds-source')].map((a) => ({ label: a.querySelector('.ds-source__label').textContent.trim(), host: a.querySelector('.ds-source__host').textContent.trim(), href: a.getAttribute('href'), out: a.querySelector('.ds-source__out') !== null })) }
  })`) as Promise<{ key: string; label: string; named: boolean; links: { label: string; host: string; href: string; out: boolean }[] }[]>

test.describe('proof on the card (story 1)', () => {
  test('S1.1 SC-001 FR-001 no page has a marker, a drawer or their words, and each has 30 sparkles and 30 anchors', async ({ page }) => {
    for (const address of PAGES) {
      await open(page, address)
      await expect(page.locator('.ds-marker, .ds-receipts, main details'), address).toHaveCount(0)
      await expect(page.locator('main .ds-claim-ask'), address).toHaveCount(30)
      await expect(page.locator('main [id^="receipt-"]'), address).toHaveCount(30)
      const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
      for (const words of ['Ask me', 'Ask Brad about it', 'Ask Brad about these', 'No public link', 'Receipts'])
        expect(text.includes(words), `${address}: ${words}`).toBe(false)
    }
  })

  test('S1.2 FR-002 the stats link their store listings, with the host under the label, and the whole stat opens it', async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      const stats = (await page.evaluate(`[...document.querySelectorAll('main .ds-stat--link')].map((stat) => {
        stat.scrollIntoView({ block: 'center' })
        const link = stat.querySelector('a.ds-stat__link')
        const box = stat.getBoundingClientRect()
        const corners = [[box.left + 4, box.top + 4], [box.right - 4, box.bottom - 4]].map(([x, y]) => document.elementFromPoint(x, y)?.closest('a.ds-stat__link') === link)
        return { value: stat.querySelector('dd').textContent.trim(), href: link.getAttribute('href'), host: link.textContent.trim(), out: link.querySelector('.ds-stat__out') !== null,
          under: link.getBoundingClientRect().top >= stat.querySelector('dt').getBoundingClientRect().bottom - 1, corners }
      })`)) as { value: string; href: string; host: string; out: boolean; under: boolean; corners: boolean[] }[]
      expect(stats.map(({ value, href, host, out }) => ({ value, href, host, out }))).toEqual([
        { value: '10M+', href: SOURCES[2], host: 'play.google.com', out: true },
        { value: '1M+', href: SOURCES[4], host: 'play.google.com', out: true },
        { value: '400K+', href: SOURCES[5], host: 'apps.apple.com', out: true },
      ])
      for (const stat of stats) {
        expect(stat.under, stat.value).toBe(true)
        expect(stat.corners, stat.value).toEqual([true, true])
      }
      // The stats with no source stay plain.
      await expect(page.locator('main .ds-stat:not(.ds-stat--link) a')).toHaveCount(0)
    }
  })

  test('S1.3 S1.4 S1.5 FR-003 FR-004 the Capital One and bradthome.com cards list their sources under the claims, and no other card does', async ({
    page,
  }) => {
    await open(page, '/')
    expect(await listsOf(page)).toEqual([
      {
        key: 'hopper-disruption-assistance',
        label: 'Sources',
        named: true,
        links: [
          { label: 'The offer card, in a 2024 travel-blog post', host: 'yourmileagemayvary.com', href: SOURCES[0], out: true },
          { label: 'Hopper Technology Solutions, March 2026', host: 'hts.hopper.com', href: SOURCES[1], out: true },
        ],
      },
      {
        key: 'side-bradthome-com',
        label: 'Sources',
        named: true,
        links: [
          { label: 'The design system', host: 'bradthome.com', href: '/design-system', out: false },
          { label: 'Each feature starts as a spec Brad approves', host: 'github.com', href: SOURCES[10], out: true },
          { label: "A release's written record", host: 'github.com', href: SOURCES[11], out: true },
          { label: 'The latest eval run, case by case', host: 'bradthome.com', href: '/evals', out: false },
        ],
      },
    ])
    // Under the claims, before the tags and the card's links.
    const order = (await page.evaluate(`[...document.querySelectorAll('main .ds-sources')].map((list) => {
      const card = list.closest('article, li.hopper__topic')
      const after = (a, b) => a && b ? (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 : true
      return after(card.querySelector('.ds-claims'), list) && after(list, card.querySelector('.ds-chips')) && after(list, card.querySelector('.side__links'))
    })`)) as boolean[]
    expect(order).toEqual([true, true])
    // FR-004: the cards' own links stay.
    const links = await page.evaluate(
      `[...document.querySelectorAll('main .side__links > a')].map((a) => [a.textContent.trim(), a.getAttribute('href')])`,
    )
    expect(links).toEqual([
      ['vindecoded.com', 'https://vindecoded.com'],
      ['Read the case study', '/vindecoded-agents'],
      ['sudokuworld.app', 'https://sudokuworld.app'],
      ['Read the source on GitHub', 'https://github.com/memorex386/bradthome'],
    ])
  })

  test('S1.6 SC-002 the page links all 13 public sources at rest, each once on its card', async ({ page }) => {
    await open(page, '/')
    const links = (await page.evaluate(
      `[...document.querySelectorAll('main .ds-stat__link, main .ds-source, main .side__links > a')].map((a) => [a.getAttribute('href'), new URL(a.getAttribute('href'), ${JSON.stringify(SITE)}).href])`,
    )) as [string, string][]
    expect(links).toHaveLength(13)
    expect([...new Set(links.map(([, absolute]) => absolute))].sort()).toEqual([...SOURCES].sort())
    // Nothing is behind a disclosure or hidden at rest.
    for (const [href] of links) await expect(page.locator(`main a[href="${href}"]`).first(), href).toBeVisible()
  })

  test('S1.7 a claim with no public link reads as plain text, ending with its sparkle and nothing else', async ({ page }) => {
    await open(page, '/')
    const claims = (await page.evaluate(
      `[...document.querySelectorAll('main .ds-claim')].map((claim) => ({ id: claim.dataset.claim, links: [...claim.querySelectorAll('a')].map((a) => a.className) }))`,
    )) as { id: string; links: string[] }[]
    expect(claims).toHaveLength(30)
    for (const claim of claims) expect(claim.links, claim.id).toEqual(['ds-claim-ask'])
  })
})

test.describe('the sparkle (story 2)', () => {
  test('S2.1 FR-005 each claim ends with one sparkle, on the line of its last word', async ({ page }) => {
    for (const viewport of [NARROW, DESKTOP]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      const ends = (await page.evaluate(`[...document.querySelectorAll('main .ds-claim')].map((claim) => {
        const asks = claim.querySelectorAll('.ds-claim-ask')
        const end = asks[0]?.closest('.ds-claim__end')
        const block = end?.closest('p, li')
        const last = [...claim.querySelectorAll('p, li')].at(-1) ?? claim
        const word = document.createRange(); word.selectNodeContents(end.firstChild)
        const w = [...word.getClientRects()].at(-1), a = asks[0].getBoundingClientRect()
        return { id: claim.dataset.claim, count: asks.length, inLast: block === last, word: end.firstChild.textContent, sameLine: Math.abs((w.top + w.bottom) / 2 - (a.top + a.bottom) / 2) < 6, ends: claim.textContent.trim().endsWith(end.firstChild.textContent) }
      })`)) as { id: string; count: number; inLast: boolean; word: string; sameLine: boolean; ends: boolean }[]
      expect(ends).toHaveLength(30)
      for (const end of ends)
        expect({ ...end, word: undefined }, `${viewport.width} ${end.id} ${end.word}`).toEqual({
          id: end.id,
          count: 1,
          inLast: true,
          word: undefined,
          sameLine: true,
          ends: true,
        })
    }
  })

  test('S2.2 FR-005 a click, a tap and Enter each open the chat with the claim’s words, unsent, and focus returns', async ({ page }) => {
    const api = await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    const sparkle = page.locator('#receipt-hopper-partner-platform-1 .ds-claim-ask')
    const question = 'Tell me more about this: “Built hopper.com features and partner portals for RBC, Lloyds Bank, Nubank and CommBank.”'
    await expect(sparkle).toHaveAttribute('data-chat-ask', question)
    await sparkle.click()
    await expect(dialogOf(page).getByLabel('Your question')).toHaveValue(question)
    await expect(dialogOf(page).getByLabel('Your question')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(sparkle).toBeFocused()
    // The keyboard: Enter on the focused sparkle.
    const other = page.locator('#receipt-vindecoded-2 .ds-claim-ask')
    await other.focus()
    await page.keyboard.press('Enter')
    await expect(dialogOf(page).getByLabel('Your question')).toHaveValue(
      'Tell me more about this: “A profitable vehicle-history and research platform for shoppers, owners and sellers.”',
    )
    await page.keyboard.press('Escape')
    await expect(other).toBeFocused()
    expect(api.posted).toHaveLength(0)
  })

  test.describe('on a touch screen', () => {
    test.use({ hasTouch: true, isMobile: true, viewport: PHONE })

    test('S2.2 a tap opens the chat with the claim’s words, unsent', async ({ page }) => {
      const api = await fakeApi(page)
      await openHome(page)
      const sparkle = page.locator('#receipt-bleacher-report-3 .ds-claim-ask')
      await sparkle.scrollIntoViewIfNeeded()
      await sparkle.tap()
      await expect(dialogOf(page).getByLabel('Your question')).toHaveValue(
        "Tell me more about this: “B/R's app shows 10M+ installs on Google Play, a figure for the whole app.”",
      )
      expect(api.posted).toHaveLength(0)
    })
  })

  test('S2.3 the case study’s counts ask with their list on one line, joined by "; "', async ({ page }) => {
    await open(page, '/')
    await expect(page.locator('#receipt-vindecoded-7 .ds-claim-ask')).toHaveAttribute(
      'data-chat-ask',
      "Tell me more about this: “The case study's counts, measured on 10/28: 1,235 merged PRs from June 13 to Oct 28, 2026, 83% of them from agent branches; 1,530 test files; 113 runbooks; 46 ADRs”",
    )
  })

  test('S2.4 each sparkle is named "Ask about this: {its claim’s title}", and no two share a name', async ({ page }) => {
    await open(page, '/')
    await expect(page.locator('#receipt-hopper-role-and-dates-1 .ds-claim-ask')).toHaveAccessibleName(
      'Ask about this: Senior Software Engineer',
    )
    await expect(page.locator('#receipt-hopper-disruption-assistance-4 .ds-claim-ask')).toHaveAccessibleName(
      'Ask about this: The offer card, as a customer saw it',
    )
    await expect(page.locator('#receipt-bradthome-com-4 .ds-claim-ask')).toHaveAccessibleName(
      'Ask about this: Its latest eval run, case by case',
    )
    const names = (await page.evaluate(
      `[...document.querySelectorAll('main .ds-claim-ask')].map((a) => a.getAttribute('aria-label'))`,
    )) as string[]
    expect(new Set(names).size).toBe(30)
    for (const name of names) expect(name).toMatch(/^Ask about this: \S/)
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`S2.5 FR-006 hover and keyboard focus take the accent on a disc, with a ring and the tooltip, on a card and in the band, ${theme}`, async ({
      page,
    }) => {
      await enter(page, { viewport: DESKTOP, theme }, 'no-preference')
      await open(page, '/')
      for (const [id, accent, rest] of [
        ['receipt-bleacher-report-2', RGB.accent[theme], 'rgba(0, 0, 0, 0)'],
        ['receipt-hopper-disruption-assistance-3', RGB.bandAccent, 'rgba(0, 0, 0, 0)'],
      ] as const) {
        const selector = `#${id} .ds-claim-ask`
        const sparkle = page.locator(selector)
        await sparkle.scrollIntoViewIfNeeded()
        const look = async () => ({
          color: await styleOf(page, selector, 'color'),
          disc: await styleOf(page, selector, 'background-color', '::before'),
          ring: await styleOf(page, selector, 'outline-style', '::before'),
          tip: await styleOf(page, selector, 'opacity', '::after'),
          words: await styleOf(page, selector, 'content', '::after'),
        })
        expect((await look()).disc, id).toBe(rest)
        expect((await look()).tip, id).toBe('0')
        await sparkle.hover()
        await page.waitForTimeout(400)
        expect(await look(), `${id} hover`).toMatchObject({ color: accent, tip: '1', words: '"Ask about this"' })
        expect((await look()).disc, `${id} hover`).not.toBe(rest)
        await page.mouse.move(2, 2)
        await sparkle.focus()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Tab')
        await page.waitForTimeout(400)
        await expect(sparkle).toBeFocused()
        expect(await look(), `${id} focus`).toMatchObject({ color: accent, ring: 'solid', tip: '1' })
      }
    })
  }

  test.describe('with no script', () => {
    test.use({ javaScriptEnabled: false })

    test('S2.6 FR-005 a sparkle is a link to the contact section', async ({ page }) => {
      await enter(page, { viewport: PHONE, theme: 'light' })
      await page.goto('/')
      await expect(page.locator('main .ds-claim-ask[href="#contact"]')).toHaveCount(30)
      await page.locator('#receipt-sudoku-world-2 .ds-claim-ask').click()
      await expect(page).toHaveURL(/#contact$/)
      await expect(page.locator('#contact')).toBeInViewport()
    })
  })

  test('S2.7 a modified click keeps the browser’s own behavior and doesn’t open the chat', async ({ page }) => {
    await fakeApi(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await openHome(page)
    for (const modifiers of [['Shift'], ['Alt']] as const) {
      await page.locator('#receipt-bookshout-2 .ds-claim-ask').click({ modifiers: [...modifiers] })
      await page.waitForTimeout(300)
      expect(await page.evaluate(`document.querySelector('dialog[data-chat-dialog]').open`), modifiers.join('+')).toBe(false)
    }
  })

  test('S2.8 FR-006 every sparkle is a 44 px target that overlaps no other and changes no line height, from 320 to 1440 px', async ({
    page,
  }) => {
    for (const address of PAGES) {
      for (const viewport of WIDTHS) {
        await enter(page, { viewport, theme: 'light' })
        await open(page, address)
        const at = `${address} at ${viewport.width}`
        const measured = (await page.evaluate(`(() => {
          const asks = [...document.querySelectorAll('main .ds-claim-ask')].map((a) => { const r = a.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height } })
          const overlaps = []
          asks.forEach((a, i) => asks.slice(i + 1).forEach((b, j) => { if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push([i, i + 1 + j]) }))
          const lines = [...document.querySelectorAll('main .ds-claim__end')].map((end) => {
            const block = end.closest('p, li')
            const lh = Number.parseFloat(getComputedStyle(block).lineHeight)
            const tops = []
            const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              const range = document.createRange(); range.selectNodeContents(node)
              for (const rect of range.getClientRects()) if (rect.width > 0) tops.push(rect.top)
            }
            tops.sort((a, b) => a - b)
            const count = tops.filter((t, i) => i === 0 || t - tops[i - 1] > 2).length
            return { height: block.getBoundingClientRect().height, expected: count * lh }
          })
          return { asks, overlaps, lines, wide: document.documentElement.scrollWidth }
        })()`)) as {
          asks: { w: number; h: number }[]
          overlaps: number[][]
          lines: { height: number; expected: number }[]
          wide: number
        }
        expect(measured.asks, at).toHaveLength(30)
        for (const ask of measured.asks) {
          expect(ask.w, at).toBeCloseTo(44, 0)
          expect(ask.h, at).toBeCloseTo(44, 0)
        }
        expect(measured.overlaps, at).toEqual([])
        for (const line of measured.lines) expect(Math.abs(line.height - line.expected), at).toBeLessThan(1)
        expect(measured.wide, at).toBe(viewport.width)
      }
    }
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`S2.9 FR-006 at rest every sparkle keeps 3:1 or more against what’s behind it, ${theme}`, async ({ page }) => {
      await enter(page, { viewport: DESKTOP, theme })
      for (const address of PAGES) {
        await open(page, address)
        const pairs = (await page.evaluate(`[...document.querySelectorAll('main .ds-claim-ask')].map((a) => {
          const parse = (c) => { const m = c.match(/[\\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 } }
          const layers = []
          for (let e = a.parentElement; e; e = e.parentElement) {
            const c = parse(getComputedStyle(e).backgroundColor)
            if (c.a > 0) layers.push(c)
            if (c.a === 1) break
          }
          let base = layers.length > 0 && layers.at(-1).a === 1 ? layers.pop() : { r: 255, g: 255, b: 255, a: 1 }
          while (layers.length > 0) { const top = layers.pop(); base = { r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 } }
          return { id: a.closest('.ds-claim').dataset.claim, color: getComputedStyle(a).color, back: 'rgb(' + [base.r, base.g, base.b].map(Math.round).join(', ') + ')' }
        })`)) as { id: string; color: string; back: string }[]
        expect(pairs, address).toHaveLength(30)
        for (const pair of pairs)
          expect(contrast(pair.color, pair.back), `${address} ${pair.id} ${pair.color} on ${pair.back}`).toBeGreaterThanOrEqual(3)
      }
    })
  }
})

test.describe('every link to a claim lands on it (story 3)', () => {
  test('S3.1 FR-007 each claim carries its anchor once, and nothing else carries one', async ({ page }) => {
    for (const address of PAGES) {
      await open(page, address)
      const anchors = (await page.evaluate(
        `[...document.querySelectorAll('[id^="receipt-"]')].map((el) => ({ id: el.id, claim: el.classList.contains('ds-claim') ? el.dataset.claim : null }))`,
      )) as { id: string; claim: string | null }[]
      expect(anchors, address).toHaveLength(30)
      for (const anchor of anchors) expect(anchor.id, address).toBe(`receipt-${anchor.claim}`)
      expect(new Set(anchors.map((anchor) => anchor.id)).size, address).toBe(30)
    }
  })

  for (const [id, band] of [
    ['hopper-fintech-ai-1', true],
    ['bleacher-report-2', false],
    ['vindecoded-7', false],
  ] as const) {
    test(`S3.2 FR-007 a link to ${id} opens with it 40% down the screen, clear of the header, and tinted`, async ({ page }) => {
      for (const theme of ['light', 'dark'] as const) {
        await enter(page, { viewport: DESKTOP, theme })
        await page.goto(`/#receipt-${id}`)
        const claim = page.locator(`#receipt-${id}`)
        await expect(claim).toBeInViewport()
        await expect.poll(async () => Math.round((await claim.boundingBox())?.y ?? -1)).toBe(Math.round(DESKTOP.height * 0.4))
        const header = (await page.locator('.ds-header').boundingBox()) ?? { y: 0, height: 0 }
        expect((await claim.boundingBox())?.y).toBeGreaterThan(header.y + header.height)
        expect(await styleOf(page, `#receipt-${id}`, 'background-color')).toBe(band ? RGB.bandFlash : RGB.accentSoft[theme])
      }
    })
  }

  test('S3.3 FR-007 with motion allowed the tint fades over 1,600 ms; with reduced motion it stays while targeted', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/#receipt-bleacher-report-2')
    const claim = '#receipt-bleacher-report-2'
    const flashes = await page.evaluate(
      `document.querySelector('${claim}').getAnimations().map((animation) => [animation.animationName, animation.effect.getTiming().duration])`,
    )
    expect(flashes).toEqual([['ds-claim-flash', 1600]])
    await page.waitForTimeout(1900)
    expect(await styleOf(page, claim, 'background-color')).toBe('rgba(0, 0, 0, 0)')
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await page.goto('/privacy')
    await page.goto(`/${claim}`)
    expect(await page.evaluate(`document.querySelector('${claim}').getAnimations().length`)).toBe(0)
    await page.waitForTimeout(1900)
    expect(await styleOf(page, claim, 'background-color')).toBe(RGB.accentSoft.light)
  })

  test('S3.4 SC-007 the corpus and llms.txt are byte for byte v2.8.0’s, and every claim they send to the home lands on it', async ({
    page,
  }) => {
    const body = async (address: string): Promise<Buffer> => (await page.request.get(address)).body()
    // SHA-256 of what bradthome.com served at v2.8.0 on 2026-11-13, so the chat API needs no redeploy. A later change to
    // the content changes these on purpose, and amends them here.
    const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')
    expect(sha(await body('/corpus.json'))).toBe('ae6d3e1f6d2fd49047d6366ee50613ab17a0e7a8996bc0c6594632e237ddd30c')
    expect(sha(await body('/llms.txt'))).toBe('b919b90e56a76f4e1f38a407151ad1d62f04b80b5c5a860140cd2e0a8593bc62')
    const corpus = JSON.parse((await body('/corpus.json')).toString('utf8')) as { sources: { id: string; url: string }[] }
    const anchored = corpus.sources.filter((source) => source.url.startsWith(`${SITE}/#receipt-`))
    expect(anchored).toHaveLength(30)
    const llms = (await body('/llms.txt')).toString('utf8')
    await open(page, '/')
    for (const source of anchored) {
      expect(source.url).toBe(`${SITE}/#receipt-${source.id}`)
      await expect(page.locator(`#receipt-${source.id}.ds-claim[data-claim="${source.id}"]`), source.id).toHaveCount(1)
      expect(llms, source.id).toContain(`/#receipt-${source.id}`)
    }
  })
})

test.describe('it moves only as asked (story 6)', () => {
  test('S6.1 FR-008 as a card reveals, its sparkles don’t pop, and nothing opens or turns', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const running = new Set<string>()
    for (const target of ['#hopper .hopper__topics', '#experience-bleacher-report', '#side-vindecoded', '#side-bradthome-com']) {
      await page.evaluate(`document.querySelector(${JSON.stringify(target)}).scrollIntoView({ block: 'center' })`)
      await page.waitForTimeout(250)
      for (const name of (await page.evaluate(
        `document.getAnimations().filter((a) => a.effect?.target?.closest?.('.ds-claim-ask, .ds-claim__end')).map((a) => a.animationName ?? 'script')`,
      )) as string[])
        running.add(name)
    }
    expect([...running]).toEqual([])
  })

  test('S6.2 SC-004 FR-008 layout shift stays 0 while the page loads and scrolls to its end, with motion allowed', async ({ page }) => {
    await watchShifts(page)
    await enter(page, { viewport: PHONE, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const height = (await page.evaluate('document.documentElement.scrollHeight')) as number
    for (let y = 0; y < height; y += 600) {
      await page.evaluate(`window.scrollTo(0, ${y})`)
      await page.waitForTimeout(120)
    }
    await page.waitForTimeout(800)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })

  test('SC-003 FR-012 the page still loads only the one module, no larger than main’s 13,039 bytes', async ({ page }) => {
    await open(page, '/')
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    expect((await (await page.request.get(src)).body()).length).toBeLessThanOrEqual(13_039)
  })
})
