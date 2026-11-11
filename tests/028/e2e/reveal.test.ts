import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'

// Spec 028 in the browser: sections reveal their evidence once, the figures'
// and address's rules, the copy's check, the cards' light, and what the
// reveal must never do (D211). Playwright asks for reduced motion by default;
// the motion tests ask for no-preference.

// The one module before this slice (spec 027's build), and Brad's Gate 1 allowance for the reveal.
const MODULE_BEFORE = 9578
const ALLOWANCE = 1024
const ACCENT = { light: 'rgb(42, 85, 229)', dark: 'rgb(142, 168, 255)' } as const

async function open(page: Page, address: string): Promise<void> {
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
  // Let the observer's first report, the page as it loads, arrive.
  await settle(page)
}

const settle = (page: Page, wait = 120): Promise<unknown> =>
  page.evaluate(`new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, ${wait}))))`)

/** Scrolls at once so an element's top sits at a share of the screen's height. */
async function bring(page: Page, selector: string, share: number, wait = 60): Promise<void> {
  await page.evaluate(
    `scrollTo({ top: Math.max(0, document.querySelector('${selector}').getBoundingClientRect().top + scrollY - innerHeight * ${share}), behavior: 'instant' })`,
  )
  await settle(page, wait)
}

interface Reveal {
  target: string
  name: string
  pseudo: string
  delay: number
  duration: number
}

/** The reveal's running animations, by target class, keyframes, delay and duration. */
const reveals = (page: Page): Promise<Reveal[]> =>
  page.evaluate(`document.getAnimations().filter((a) => a.timeline === document.timeline && String(a.animationName).startsWith('ds-rv')).map((a) => {
    const timing = a.effect.getTiming()
    const target = a.effect.target
    return {
      target: String(target.className.baseVal ?? target.className).split(' ')[0],
      name: a.animationName,
      pseudo: a.effect.pseudoElement ?? '',
      delay: Math.round(timing.delay),
      duration: Math.round(Number(timing.duration)),
    }
  })`) as Promise<Reveal[]>

const states = (page: Page): Promise<string[]> =>
  page.evaluate(`[...document.querySelectorAll('[data-rv]')].map((block) => block.dataset.rv)`) as Promise<string[]>

test.describe('each section settles in as it arrives (story 1)', () => {
  test('S1.1 S1.4 SC-001 FR-001 Experience’s head rises and inks, and its timeline’s bars draw oldest first', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await bring(page, '#experience', 0.5)
    const found = await reveals(page)
    expect(found).toContainEqual({ target: 'ds-eyebrow', name: 'ds-rv-rise', pseudo: '', delay: 0, duration: 480 })
    expect(found).toContainEqual({ target: 'ds-heading', name: 'ds-rv-rise', pseudo: '', delay: 70, duration: 600 })
    expect(found).toContainEqual({ target: 'ds-heading', name: 'ds-rv-ink', pseudo: '', delay: 70, duration: 600 })
    const timeline = found.find((a) => a.target === 'experience__timeline')
    expect(timeline?.duration).toBe(560)
    const bars = found.filter((a) => a.target === 'experience__span')
    const rows = (await page.evaluate(`document.querySelectorAll('.experience__span').length`)) as number
    expect(bars).toHaveLength(rows)
    // The bars' delays step by 70 ms from 120 ms after the timeline, and the newest, Hopper's, comes last.
    const delays = bars.map((bar) => bar.delay)
    expect(delays[0]).toBe((timeline?.delay ?? 0) + 120 + (rows - 1) * 70)
    expect(delays.at(-1)).toBe((timeline?.delay ?? 0) + 120)
    for (const bar of bars) expect(bar.duration).toBe(640)
  })

  test('S1.2 S1.3 SC-001 FR-001 cards arriving together start 90 ms apart, and their markers pop 220 ms after, 45 ms apart', async ({
    page,
  }) => {
    await enter(page, { viewport: { width: 1440, height: 1600 }, theme: 'light' }, 'no-preference')
    await open(page, '/')
    // Jump past Hopper, then back to its topics, so several arrive in the same report.
    await page.evaluate(`scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })`)
    // Let the blocks at the end finish playing first.
    await settle(page, 1500)
    await bring(page, '.hopper__topics', 0.1)
    const cards = (await reveals(page)).filter((a) => a.name === 'ds-rv-rise' && a.target === 'ds-card')
    expect(cards.length).toBeGreaterThan(1)
    cards.forEach((card, index) => {
      expect(card.delay).toBe(index * 90)
      expect(card.duration).toBe(560)
    })
    const markers = (await page.evaluate(`[...document.querySelector('.hopper__topic[data-rv="go"]').querySelectorAll('.ds-claims .ds-marker')].map((m) => {
      const t = m.getAnimations()[0].effect.getTiming()
      return [Math.round(t.delay), Math.round(Number(t.duration))]
    })`)) as [number, number][]
    markers.forEach(([delay, duration], index) => {
      expect(delay).toBe(220 + index * 45)
      expect(duration).toBe(320)
    })
  })

  test('S1.5 FR-005 a block whose edge has entered is posed, moved and never hidden, and rests again if it leaves', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    // The side section's head just past the screen's edge, inside the observer's 20 px margin.
    await page.evaluate(
      `scrollTo({ top: document.querySelector('.side__head').getBoundingClientRect().top + scrollY - innerHeight - 15, behavior: 'instant' })`,
    )
    await settle(page, 200)
    expect(await page.evaluate(`document.querySelector('.side__head').dataset.rv`)).toBe('pre')
    const pose = (await page.evaluate(`(() => {
      const h = getComputedStyle(document.querySelector('.side__head .ds-heading'))
      return [h.translate, h.opacity, h.visibility, h.filter]
    })()`)) as string[]
    expect(pose).toEqual(['0px 14px', '1', 'visible', 'none'])
    await page.evaluate(`scrollTo({ top: 0, behavior: 'instant' })`)
    await settle(page, 200)
    expect(await page.evaluate(`document.querySelector('.side__head').dataset.rv`)).toBeUndefined()
  })

  test('S1.5 FR-005 a card posed with only its edge on screen stays posed; its own move never pushes it out and back', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    // The timeline's top 6 px on screen: its 18 px pose would carry it past the screen's edge.
    await page.evaluate(
      `scrollTo({ top: document.querySelector('.experience__timeline').getBoundingClientRect().top + scrollY - innerHeight + 6, behavior: 'instant' })`,
    )
    await settle(page, 100)
    await page.evaluate(`(() => {
      window.__flips = 0
      new MutationObserver((list) => { window.__flips += list.length }).observe(document.querySelector('.experience__timeline'), { attributeFilter: ['data-rv'] })
    })()`)
    await settle(page, 600)
    expect(await page.evaluate(`document.querySelector('.experience__timeline').dataset.rv`)).toBe('pre')
    expect(await page.evaluate('window.__flips')).toBe(0)
  })
})

test.describe('the figures carry their rule (story 2)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`S2.1 FR-002 each figure has a 3 px accent rule as wide as it, on the home and the gallery, ${theme}`, async ({ page }) => {
      await enter(page, { viewport: DESKTOP, theme })
      for (const address of ['/', '/mobile', '/design-system']) {
        await open(page, address)
        const rules = (await page.evaluate(`[...document.querySelectorAll('.ds-stat dd')].map((dd) => {
          const after = getComputedStyle(dd, '::after')
          return [after.height, after.backgroundColor, Math.round(parseFloat(after.width)) === Math.round(dd.getBoundingClientRect().width)]
        })`)) as [string, string, boolean][]
        expect(rules.length, address).toBeGreaterThan(0)
        for (const rule of rules) expect(rule, address).toEqual(['3px', ACCENT[theme], true])
      }
      await open(page, '/')
      const figures = (await page.evaluate(`[...document.querySelectorAll('main .ds-stat dd')].map((dd) => dd.textContent.trim())`)) as string[]
      expect(figures).toEqual(['10M+', 'Promoted', '1M+', '400K+'])
    })
  }

  test('S2.2 S2.3 SC-001 FR-001 the figures’ rules draw 100 ms after their card, 90 ms apart; the address’s in 760 ms', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await bring(page, '#experience-bleacher-report', 0.4)
    const card = (await reveals(page)).find((a) => a.target === 'ds-card' && a.name === 'ds-rv-rise')
    const rules = (await reveals(page)).filter((a) => a.pseudo === '::after' && a.name === 'ds-rv-draw')
    expect(rules.map((rule) => [rule.delay, rule.duration])).toEqual([
      [(card?.delay ?? 0) + 100, 680],
      [(card?.delay ?? 0) + 190, 680],
    ])
    await bring(page, '#contact', 0.5)
    expect(await reveals(page)).toContainEqual({ target: 'ds-email__text', name: 'ds-rv-draw', pseudo: '::after', delay: 100, duration: 760 })
  })

  test('S2.3 FR-002 the address keeps a 2 px rule in its color, and no text underline', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'dark' })
    await open(page, '/')
    const [line, height, color, ink] = (await page.evaluate(`(() => {
      const a = document.querySelector('.ds-email__address')
      const after = getComputedStyle(a.querySelector('.ds-email__text'), '::after')
      return [getComputedStyle(a).textDecorationLine, after.height, after.backgroundColor, getComputedStyle(a).color]
    })()`)) as string[]
    expect(line).toBe('none')
    expect(height).toBe('2px')
    expect(color).toBe(ink)
  })
})

test.describe('copying the address answers with a check (story 3)', () => {
  test('S3.1 SC-001 FR-003 the icon gives way to a check that draws in 300 ms, the label slides in 220 ms, and it rests after 2.6 s', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.clock.install()
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await bring(page, '#contact', 0.3)
    // Hold the page's clock still, so only runFor moves the 2.6 s on, however busy the machine is.
    await page.clock.pauseAt(Date.now() + 60_000)
    const block = page.locator('#contact [data-email]')
    await block.locator('[data-email-copy]').click()
    await expect(block).toHaveAttribute('data-state', 'copied')
    const running = (await page.evaluate(`document.getAnimations().filter((a) => a.transitionProperty).map((a) => [a.transitionProperty, Math.round(Number(a.effect.getTiming().duration))])`)) as [
      string,
      number,
    ][]
    expect(running).toContainEqual(['stroke-dashoffset', 300])
    expect(running).toContainEqual(['translate', 220])
    expect(running).toContainEqual(['scale', 220])
    const visible = (await page.evaluate(
      `[...document.querySelectorAll('#contact .ds-email__icons > svg')].map((svg) => getComputedStyle(svg).visibility)`,
    )) as string[]
    expect(visible).toEqual(['hidden', 'visible'])
    await page.clock.runFor(2500)
    await expect(block).toHaveAttribute('data-state', 'copied')
    await page.clock.runFor(200)
    await expect(block).toHaveAttribute('data-state', 'rest')
  })

  test('S3.2 FR-003 a refused copy selects the address, keeps the copy icon and slides its label in', async ({ page }) => {
    await page.addInitScript(`Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('refused')) } })`)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await bring(page, '#contact', 0.3)
    const block = page.locator('#contact [data-email]')
    await block.locator('[data-email-copy]').click()
    await expect(block).toHaveAttribute('data-state', 'selected')
    const visible = (await page.evaluate(
      `[...document.querySelectorAll('#contact .ds-email__icons > svg')].map((svg) => getComputedStyle(svg).visibility)`,
    )) as string[]
    expect(visible).toEqual(['visible', 'hidden'])
    expect(await page.evaluate(`getComputedStyle(document.querySelector('#contact [data-label="selected"]')).transitionDuration`)).toBe('0.22s')
  })

  test('S3.3 FR-003 under reduced motion the swap is instant and the check is whole', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await bring(page, '#contact', 0.3)
    await page.locator('#contact [data-email-copy]').click()
    await expect(page.locator('#contact [data-email]')).toHaveAttribute('data-state', 'copied')
    expect(await page.evaluate(`document.getAnimations().filter((a) => a.timeline === document.timeline).length`)).toBe(0)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('#contact .ds-email__icons > svg + svg path')).strokeDashoffset`)).toBe('0px')
  })

  test('S3.4 FR-003 the gallery’s held copied state shows the check whole, at rest', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/design-system')
    const [icons, offset] = (await page.evaluate(`(() => {
      const block = document.querySelector('[data-email][data-demo="copied"]')
      return [[...block.querySelectorAll('.ds-email__icons > svg')].map((svg) => getComputedStyle(svg).visibility), getComputedStyle(block.querySelector('.ds-email__icons > svg + svg path')).strokeDashoffset]
    })()`)) as [string[], string]
    expect(icons).toEqual(['hidden', 'visible'])
    expect(offset).toBe('0px')
  })
})

test.describe('a light follows the pointer over a card (story 4)', () => {
  test('S4.1 FR-004 on a pointer device, the light sits under the pointer, behind the text', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    await bring(page, '#experience-bookshout', 0.3, 900)
    const card = page.locator('#experience-bookshout')
    const box = await card.boundingBox()
    await page.mouse.move((box?.x ?? 0) + 120, (box?.y ?? 0) + 60)
    await page.mouse.move((box?.x ?? 0) + 140, (box?.y ?? 0) + 70)
    const [mx, my, image] = (await page.evaluate(`(() => {
      const card = document.querySelector('#experience-bookshout')
      return [card.style.getPropertyValue('--mx'), card.style.getPropertyValue('--my'), getComputedStyle(card).backgroundImage]
    })()`)) as string[]
    expect([mx, my]).toEqual(['140px', '70px'])
    // The light is the card's own background layer, so it sits under the text.
    expect(image).toContain('radial-gradient')
    await expect.poll(() => page.evaluate(`getComputedStyle(document.querySelector('#experience-bookshout')).getPropertyValue('--rv-glow')`)).toBe('1')
  })

  test('S4.2 FR-004 under reduced motion there is no light, and cards that aren’t links never move', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    await page.locator('#experience-bookshout').hover()
    const [content, translate] = (await page.evaluate(`(() => {
      const card = document.querySelector('#experience-bookshout')
      return [getComputedStyle(card).backgroundImage, getComputedStyle(card).translate]
    })()`)) as string[]
    expect(content).toBe('none')
    expect(translate).toBe('none')
  })

  test('S4.2 FR-004 with no script there is no light on hover', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    await page.goto('/')
    await page.locator('#experience-bookshout').hover()
    await page.waitForTimeout(400)
    expect(await page.evaluate(`getComputedStyle(document.querySelector('#experience-bookshout')).backgroundImage`)).toBe('none')
    await context.close()
  })
})

test.describe('nothing is hidden, and nothing plays twice (story 5)', () => {
  for (const [size, viewport] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ] as const) {
    test(`S5.1 SC-002 FR-005 nothing is posed at load, and a full-page capture without scrolling leaves every block at rest, ${size}`, async ({
      page,
    }) => {
      await enter(page, { viewport, theme: 'light' }, 'no-preference')
      await open(page, '/')
      expect(await states(page)).toEqual([])
      await page.screenshot({ fullPage: true, animations: 'allow' })
      await settle(page, 300)
      expect(await states(page)).toEqual([])
      expect(await reveals(page)).toEqual([])
    })
  }

  test('S5.2 SC-003 FR-001 once every block has played, scrolling back, resizing and opening a drawer replay nothing', async ({ page }) => {
    await enter(page, { viewport: PHONE, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const height = (await page.evaluate('document.body.scrollHeight')) as number
    for (let y = 0; y < height; y += 300) {
      await page.evaluate(`scrollTo({ top: ${y}, behavior: 'instant' })`)
      await settle(page, 40)
    }
    await settle(page, 1500)
    const played = await states(page)
    expect(played.length).toBeGreaterThan(10)
    expect(played.every((state) => state === 'go')).toBe(true)
    expect(await reveals(page)).toEqual([])
    for (let y = height; y >= 0; y -= 600) {
      await page.evaluate(`scrollTo({ top: ${y}, behavior: 'instant' })`)
      await settle(page, 40)
      expect(await reveals(page), `at ${y}`).toEqual([])
    }
    await page.setViewportSize(DESKTOP)
    await bring(page, '#experience-bookshout', 0.3)
    await page.locator('#experience-bookshout .ds-receipts__summary').click()
    await settle(page)
    expect(await reveals(page)).toEqual([])
  })

  test('S5.3 FR-001 a deep link’s section plays once as it lands, and the hero is already settled', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await page.goto('/#experience')
    await expect.poll(() => page.evaluate(`document.querySelector('.experience__head').dataset.rv`)).toBe('go')
    const hero = (await page.evaluate(`document.querySelector('.hero').getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length`)) as number
    expect(hero).toBe(0)
  })

  test('S5.4 FR-005 FR-006 under reduced motion no block is ever posed or played', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    const height = (await page.evaluate('document.body.scrollHeight')) as number
    for (let y = 0; y < height; y += 400) {
      await page.evaluate(`scrollTo({ top: ${y}, behavior: 'instant' })`)
      await settle(page, 40)
      expect(await states(page), `at ${y}`).toEqual([])
    }
    expect(await page.evaluate(`getComputedStyle(document.querySelector('.experience__span')).scale`)).toBe('none')
  })

  test('S5.5 FR-005 with no script the page is complete and nothing is posed', async ({ browser }) => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP, reducedMotion })
      const page = await context.newPage()
      await page.goto('/')
      await page.evaluate(`scrollTo({ top: document.body.scrollHeight / 2, behavior: 'instant' })`)
      expect(await page.locator('[data-rv]').count()).toBe(0)
      expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(10)
      await context.close()
    }
  })

  test('S5.6 FR-005 every reveal moves only translate, scale and color', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const properties = new Set<string>()
    for (const id of ['#hopper', '#experience', '#side', '#contact']) {
      await bring(page, id, 0.5)
      const found = (await page.evaluate(`document.getAnimations().filter((a) => String(a.animationName).startsWith('ds-rv')).flatMap((a) => a.effect.getKeyframes().flatMap((k) => Object.keys(k)))`)) as string[]
      for (const property of found) properties.add(property)
    }
    const moved = [...properties].filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))
    expect(moved.length).toBeGreaterThan(0)
    for (const property of moved) expect(['translate', 'scale', 'color']).toContain(property)
  })
})

test.describe('it still works for everyone (story 6)', () => {
  test('S6.3 SC-004 FR-007 layout shift stays 0 as the page loads and every section reveals', async ({ page }) => {
    await page.addInitScript(
      `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
    )
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' }, 'no-preference')
      await open(page, '/')
      const height = (await page.evaluate('document.body.scrollHeight')) as number
      for (let y = 0; y < height; y += 350) {
        await page.evaluate(`scrollTo({ top: ${y}, behavior: 'instant' })`)
        await settle(page, 80)
      }
      await settle(page, 1200)
      expect(await page.evaluate('window.__shift')).toBe(0)
    }
  })

  test('S6.4 SC-004 FR-006 the reveal adds one IntersectionObserver and one passive pointermove listener, and no scroll listener', async ({
    page,
  }) => {
    await page.addInitScript(`(() => {
      window.__scroll = []
      window.__pointer = []
      const add = EventTarget.prototype.addEventListener
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (type === 'scroll' || type === 'scrollend' || type === 'wheel') window.__scroll.push(type)
        if (type === 'pointermove') window.__pointer.push(!!(options && options.passive))
        return add.call(this, type, listener, options)
      }
      window.__observers = 0
      const Observer = window.IntersectionObserver
      window.IntersectionObserver = class extends Observer { constructor(...args) { super(...args); window.__observers += 1 } }
    })()`)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    for (const id of ['#experience', '#side', '#contact']) await bring(page, id, 0.5)
    // Spec 016's previews keep one passive scroll listener per preview link (spec 027); the header has three observers.
    const previewLinks = (await page.evaluate(`document.querySelectorAll('a[data-preview]').length`)) as number
    expect(await page.evaluate('window.__scroll')).toEqual(Array.from({ length: previewLinks }, () => 'scroll'))
    expect(await page.evaluate('window.__observers')).toBe(4)
    expect(await page.evaluate('window.__pointer')).toEqual([true])
  })

  test('S6.5 SC-005 FR-007 each page loads only the one module, grown by at most 1,024 bytes', async ({ page }) => {
    for (const address of ['/', '/mobile', '/fullstack', '/ai', '/design-system']) {
      await open(page, address)
      expect(await onlyPreviewScript(page), address).toBe(true)
    }
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    const size = (await (await page.request.get(src)).body()).length
    // Spec 029 adds the role switch's morph, at most 768 bytes (Brad's Gate 1 card, D212).
    // Spec 030 adds the chat's hand-off from "Ask me", at most 384 bytes (Brad's Gate 1 card, D213).
    expect(size - MODULE_BEFORE).toBeLessThanOrEqual(ALLOWANCE + 768 + 384)
  })
})
