import { createHash } from 'node:crypto'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, loadPictures, PHONE } from '../../010/helpers/e2e.ts'
import { onlyPreviewScript } from '../../016/helpers/scripts.ts'
import { watchShifts } from '../../036/helpers/e2e.ts'
import { labelsOf, FIGURES } from '../../../apps/site/src/components/home/figures.ts'
import { OWNERS_LINE } from '../../../apps/site/src/components/home/marks.ts'
import { TOPIC_ORDER } from '../../../apps/site/src/components/home/roles.ts'

// Spec 039 in the browser: each page's share tags and the cards they name,
// the side cards' pictures, the Hopper diagrams' place and words, the two
// marks and the owners line, the site icon, the photo, the gallery, and that
// nothing else moved: no outside request, no new script, no shift, and the
// corpus unchanged. Playwright's config asks for reduced motion by default.

const SITE = 'https://bradthome.com'
const SHARED = [
  ['/', 'home'],
  ['/mobile', 'mobile'],
  ['/fullstack', 'fullstack'],
  ['/ai', 'ai'],
  ['/vindecoded-agents', 'vindecoded-agents'],
  ['/evals', 'evals'],
] as const
const HOMES = ['/', '/mobile', '/fullstack', '/ai'] as const
const LIGHT_RULE = 'rgb(227, 227, 221)'
const DARK_RULE = 'rgb(39, 44, 53)'

async function open(page: Page, address: string): Promise<void> {
  await page.clock.setFixedTime(FIXED_TIME)
  await page.goto(address)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** A PNG's size, from its header. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

const content = (page: Page, selector: string): Promise<string | null> => page.locator(selector).getAttribute('content')

const boxOf = async (target: Locator): Promise<{ x: number; y: number; width: number; height: number }> => {
  const box = await target.boundingBox()
  if (box === null) throw new Error('no box')
  return box
}

test.describe('share cards (story 1)', () => {
  test('S1.5 S1.7 SC-001 FR-002 FR-003 every page with share tags names its own built card: a 1200 × 630 PNG under 300 KB', async ({
    page,
  }) => {
    for (const [address, id] of SHARED) {
      await open(page, address)
      const url = `${SITE}/share/${id}.png`
      expect(await content(page, 'meta[property="og:image"]'), address).toBe(url)
      expect(await content(page, 'meta[property="og:image:width"]'), address).toBe('1200')
      expect(await content(page, 'meta[property="og:image:height"]'), address).toBe('630')
      expect(await content(page, 'meta[name="twitter:card"]'), address).toBe('summary_large_image')
      expect(await content(page, 'meta[name="twitter:image"]'), address).toBe(url)
      const alt = await content(page, 'meta[property="og:image:alt"]')
      expect(alt?.length ?? 0, address).toBeGreaterThan(40)
      expect(await content(page, 'meta[name="twitter:image:alt"]'), address).toBe(alt)
      const response = await page.request.get(`/share/${id}.png`)
      expect(response.status(), id).toBe(200)
      expect(response.headers()['content-type'], id).toMatch(/^image\/png/)
      const body = await response.body()
      expect(body.length, id).toBeLessThan(300 * 1024)
      expect(pngSize(body), id).toEqual({ width: 1200, height: 630 })
    }
  })

  test("S1.1 S1.2 the home's and role pages' cards say what their alt text says, with the years counted for the build's day", async ({
    page,
  }) => {
    await open(page, '/')
    const home = (await content(page, 'meta[property="og:image:alt"]')) ?? ''
    expect(home).toMatch(
      /^Brad Thome · Senior mobile & full-stack engineer\. Mobile\. Full-stack\. Applied AI\. Mobile: \d+\+ years, Android and iOS apps, since May 2015\./,
    )
    for (const [address, title] of [
      ['/mobile', 'Brad Thome · Mobile engineer'],
      ['/fullstack', 'Brad Thome · Full-stack engineer'],
      ['/ai', 'Brad Thome · Applied AI'],
    ] as const) {
      await open(page, address)
      expect(await content(page, 'meta[property="og:title"]'), address).toBe(title)
      expect(await content(page, 'meta[property="og:image:alt"]'), address).toMatch(new RegExp(`^${title}\\. `))
    }
  })

  test('S1.3 S1.4 the essay’s and /evals’ cards say their counts, from the essay and the latest run', async ({ page }) => {
    await open(page, '/vindecoded-agents')
    expect(await content(page, 'meta[property="og:image:alt"]')).toContain(
      '1,235 pull requests merged, 83% from agent branches, June 13 to October 28, 2026',
    )
    await open(page, '/evals')
    expect(await content(page, 'meta[property="og:image:alt"]')).toMatch(
      /^How the chat is tested: safe answers, \d+ of \d+; accurate answers, \d+ of \d+; model that answers, Claude/,
    )
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(`${SITE}/evals`)
  })

  test('S1.6 FR-003 the 404 page, /privacy and the gallery set no share tags, and no print page is left', async ({ page }) => {
    for (const address of ['/no-such-page', '/privacy', '/design-system']) {
      await open(page, address)
      await expect(page.locator('meta[property^="og:"], meta[name^="twitter:"]'), address).toHaveCount(0)
    }
    for (const id of ['home', 'evals']) expect((await page.request.get(`/share/${id}.html`)).status(), id).toBe(404)
  })

  test('S1.8 S8.1 SC-002 FR-012 a visitor’s pages request no share card, and nothing from another host', async ({ page, baseURL }) => {
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))
    for (const address of ['/', '/mobile', '/fullstack', '/ai', '/vindecoded-agents', '/evals', '/privacy']) {
      await enter(page, { viewport: PHONE, theme: 'light' })
      await open(page, address)
      await loadPictures(page)
    }
    expect(requests.length).toBeGreaterThan(0)
    const origin = new URL(baseURL ?? '').origin
    for (const url of requests) expect(new URL(url).origin, url).toBe(origin)
    expect(requests.filter((url) => new URL(url).pathname.startsWith('/share/'))).toEqual([])
  })
})

test.describe('the side cards’ pictures (story 2)', () => {
  for (const [theme, rule] of [
    ['light', LIGHT_RULE],
    ['dark', DARK_RULE],
  ] as const) {
    test(`S2.1 S2.3 FR-005 the apps' App Store icons and the site icon, sized, lazy, with empty alt and the apps' hairline edge, ${theme}`, async ({
      page,
    }) => {
      await enter(page, { viewport: DESKTOP, theme })
      await open(page, '/')
      // Read each picture's loading attribute before loadPictures sets it to eager.
      expect(
        await page.locator('#side .side__card-head img').evaluateAll((images) => images.map((image) => image.getAttribute('loading'))),
      ).toEqual(['lazy', 'lazy', 'lazy'])
      await loadPictures(page)
      for (const [card, src, size, edge] of [
        ['#side-vindecoded', /^\/previews\/appstore-1191483515-[0-9a-f]{12}\.webp$/, 52, true],
        ['#side-sudoku-world', /^\/previews\/appstore-1544613828-[0-9a-f]{12}\.webp$/, 44, true],
        ['#side-bradthome-com', /^\/favicon\.svg$/, 44, false],
      ] as const) {
        const picture = page.locator(`${card} .side__card-head img`)
        await expect(picture, card).toHaveCount(1)
        await expect(picture, card).toHaveAttribute('src', src)
        await expect(picture, card).toHaveAttribute('alt', '')
        await expect(picture, card).toHaveAttribute('width', String(size))
        await expect(picture, card).toHaveAttribute('height', String(size))
        const box = await boxOf(picture)
        expect([Math.round(box.width), Math.round(box.height)], card).toEqual([size, size])
        expect(await picture.evaluate((image) => (image as unknown as { naturalWidth: number }).naturalWidth), card).toBeGreaterThan(0)
        const badge = page.locator(`${card} .side__badge`)
        const outline = await badge.evaluate((element) => {
          const style = element.ownerDocument.defaultView?.getComputedStyle(element)
          return [style?.outlineStyle, style?.outlineColor]
        })
        expect(outline, card).toEqual(edge ? ['solid', rule] : ['none', expect.any(String)])
        await expect(page.locator(`${card} .side__badge--grid, ${card} .side__badge:not(.side__badge--icon)`), card).toHaveCount(0)
      }
    })
  }

  test('S2.2 S2.4 with a snapshot the hover card keeps its picture; the gallery shows the badge a card falls back to', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/')
    // Amended by spec 041 (D239): VINDecoded's App Store link is in its footer.
    const link = page.locator('#side-vindecoded .pulse__links > a[href*="apps.apple.com"]')
    const preview = link.locator('xpath=following-sibling::*[@data-preview-card][1]')
    await link.hover()
    await expect.poll(() => preview.evaluate((element) => element.matches(':popover-open'))).toBe(true)
    await expect(preview.locator('.lp-card__image')).toHaveAttribute('src', /^\/previews\/appstore-1191483515-[0-9a-f]{12}\.webp$/)
    await open(page, '/design-system')
    await expect(page.locator('#pictures .g-badges .g-pic--letters')).toHaveText('VD')
  })
})

test.describe('the Hopper diagrams (story 3)', () => {
  const CARDS = [
    ['Disruption Assistance', '#hopper-disruption-assistance', 'capital-one'],
    ['Mobile: RemoteUI and WebViews', '#hopper-mobile-remoteui-and-webviews', 'remoteui'],
    ['Agent and experimentation workflow', '#hopper-agent-and-experimentation-workflow', 'loop'],
  ] as const

  test('S3.1 S3.2 S3.3 S3.4 each diagram draws its claims’ words, every label inside its frame', async ({ page }) => {
    await enter(page, { viewport: DESKTOP, theme: 'dark' })
    await open(page, '/')
    await expect(page.locator('#hopper .hopper__figure')).toHaveCount(3)
    for (const [topic, heading, kind] of CARDS) {
      const figure = page.locator(`.hopper__topic:has(${heading}) .hopper__figure`)
      await expect(figure, topic).toHaveAttribute('data-figure', kind)
      const texts = await figure.locator('text').allTextContents()
      const drawn = FIGURES[topic]
      if (drawn === undefined) throw new Error(`No diagram for ${topic}`)
      const labels = labelsOf(drawn).map((label) => label.text)
      expect(texts.map((text) => text.trim()).sort(), topic).toEqual([...labels].sort())
      const outside = await figure.locator('svg').evaluate((svg) => {
        const frame = (svg as unknown as { viewBox: { baseVal: { x: number; y: number; width: number; height: number } } }).viewBox.baseVal
        return [
          ...(svg.querySelectorAll('text') as unknown as Iterable<{
            getBBox(): { x: number; y: number; width: number; height: number }
            textContent: string | null
          }>),
        ]
          .filter((text) => {
            const box = text.getBBox()
            return (
              box.x < frame.x - 0.5 ||
              box.y < frame.y - 0.5 ||
              box.x + box.width > frame.x + frame.width + 0.5 ||
              box.y + box.height > frame.y + frame.height + 0.5
            )
          })
          .map((text) => text.textContent)
      })
      expect(outside, topic).toEqual([])
    }
  })

  test('S3.5 FR-006 each diagram takes its card’s right column, 340 px wide, from 1088 px, and follows the claims, before the sources and tags, when narrower', async ({
    page,
  }) => {
    for (const viewport of [DESKTOP, { width: 1088, height: 800 }, { width: 1024, height: 800 }, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      const wide = viewport.width >= 1088
      for (const [topic, heading] of CARDS) {
        const card = page.locator(`.hopper__topic:has(${heading})`)
        const figure = await boxOf(card.locator('.hopper__figure'))
        const claims = await boxOf(card.locator('.ds-claims'))
        const tags = await boxOf(card.locator('.ds-chips'))
        const label = `${topic} at ${viewport.width}`
        if (wide) {
          expect(Math.round(figure.width), label).toBe(340)
          expect(figure.x, label).toBeGreaterThan(claims.x + claims.width)
          expect(figure.y, label).toBeLessThan(claims.y)
        } else {
          expect(figure.y, label).toBeGreaterThanOrEqual(claims.y + claims.height)
          expect(tags.y, label).toBeGreaterThanOrEqual(figure.y + figure.height)
          const sources = card.locator('.ds-sources')
          if ((await sources.count()) > 0) expect((await boxOf(sources)).y, label).toBeGreaterThanOrEqual(figure.y + figure.height)
        }
      }
    }
  })

  test('S3.6 the diagrams are hidden from screen readers, so the band reads as its claims', async ({ page }) => {
    await open(page, '/')
    await expect(page.locator('#hopper figure.hopper__figure[aria-hidden="true"]')).toHaveCount(3)
    const read = await page.locator('#hopper').ariaSnapshot()
    // Labels only the diagrams hold: the claims say "sole engineering owner", "releases behind flags" and the rest in lower case.
    for (const words of [
      'Sole engineering owner',
      'Experimentation loop',
      'Releases behind flags',
      'Monitors outcomes',
      'Capital One → 5 more partners',
    ])
      expect(read).not.toContain(words)
  })

  test('S3.8 SC-004 on each role page each diagram moves with its topic, and the topics keep their order', async ({ page }) => {
    const kinds: Record<string, string> = {
      'Disruption Assistance': 'capital-one',
      'Mobile: RemoteUI and WebViews': 'remoteui',
      'Agent and experimentation workflow': 'loop',
    }
    for (const role of ['mobile', 'fullstack', 'ai'] as const) {
      await open(page, `/${role}`)
      const topics = page.locator('#hopper .hopper__topic')
      await expect(topics).toHaveCount(TOPIC_ORDER[role].length)
      for (const [index, name] of TOPIC_ORDER[role].entries()) {
        const figure = topics.nth(index).locator('.hopper__figure')
        if (kinds[name] === undefined) await expect(figure, `${role} ${name}`).toHaveCount(0)
        else await expect(figure, `${role} ${name}`).toHaveAttribute('data-figure', kinds[name] ?? '')
      }
    }
  })

  test('S3.7 SC-003 with motion allowed the diagrams settle with their cards, add no motion of their own, and the page never shifts', async ({
    page,
  }) => {
    await watchShifts(page)
    await enter(page, { viewport: DESKTOP, theme: 'light' }, 'no-preference')
    await open(page, '/')
    const height = (await page.evaluate('document.documentElement.scrollHeight')) as number
    for (let top = 0; top < height; top += 400) {
      await page.locator('body').evaluate((body, y) => body.ownerDocument.defaultView?.scrollTo(0, y), top)
      await page.waitForTimeout(80)
      // A card's reveal runs on the card itself (D211); nothing runs on a diagram or inside it.
      const own = await page
        .locator('#hopper .hopper__figure')
        .evaluateAll((figures) => figures.flatMap((figure) => figure.getAnimations({ subtree: true })).length)
      expect(own).toBe(0)
    }
    await page.waitForTimeout(800)
    expect(await page.evaluate('window.__shift')).toBe(0)
  })

  test('SC-006 the band grows by about what the plan measured: at most 450 px on a 1440 px desktop and 1,100 on a 375 px phone', async ({
    page,
  }) => {
    for (const [viewport, live, most] of [
      [{ width: 1440, height: 900 }, 2456, 450],
      [{ width: 375, height: 812 }, 3955, 1100],
    ] as const) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      const band = Math.round((await boxOf(page.locator('#hopper'))).height)
      expect(band, `${viewport.width}`).toBeGreaterThan(live)
      expect(band - live, `${viewport.width}`).toBeLessThanOrEqual(most)
    }
  })
})

test.describe('the marks and the owners line (story 4)', () => {
  test("S4.1 FR-008 Hopper's own mark sits before the band's eyebrow, 30 px tall, with empty alt", async ({ page }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'dark' })
      await open(page, '/')
      const mark = page.locator('#hopper .hopper__head .ds-eyebrow > img.hopper__mark')
      await expect(mark).toHaveAttribute('src', '/marks/hopper.png')
      await expect(mark).toHaveAttribute('alt', '')
      await expect(mark).toHaveAttribute('loading', 'lazy')
      await loadPictures(page)
      const box = await boxOf(mark)
      expect(Math.round(box.height), `${viewport.width}`).toBe(30)
      expect(Math.round(box.width), `${viewport.width}`).toBe(112)
      expect(await page.locator('#hopper .ds-eyebrow').evaluate((p) => p.firstElementChild?.tagName)).toBe('IMG')
      await expect(page.locator('#hopper .ds-eyebrow')).toHaveText('Experience · Hopper · Apr 2022 – Oct 2026')
    }
  })

  test("S4.2 FR-008 Bleacher Report's own mark sits before its kicker and title, 40 px tall, and above them on a phone", async ({
    page,
  }) => {
    for (const viewport of [DESKTOP, PHONE]) {
      await enter(page, { viewport, theme: 'light' })
      await open(page, '/')
      const head = page.locator('#experience-bleacher-report .experience__card-head')
      const mark = head.locator('img.experience__mark')
      await expect(mark).toHaveAttribute('src', '/marks/bleacher-report.svg')
      await expect(mark).toHaveAttribute('alt', '')
      await loadPictures(page)
      const box = await boxOf(mark)
      const kicker = await boxOf(head.locator('.ds-card__kicker'))
      const title = await boxOf(head.locator('h3'))
      expect(Math.round(box.height), `${viewport.width}`).toBe(40)
      if (viewport === DESKTOP) {
        expect(box.x + box.width, 'desktop').toBeLessThan(kicker.x)
        expect(box.y, 'desktop').toBeLessThan(title.y + title.height)
        expect(box.y + box.height, 'desktop').toBeGreaterThan(kicker.y)
      } else {
        expect(box.y + box.height, 'phone').toBeLessThanOrEqual(kicker.y)
      }
    }
  })

  test('S4.3 FR-008 no other company’s picture shows: two marks on each page, none in the timeline, and every picture the site’s own', async ({
    page,
  }) => {
    for (const address of HOMES) {
      await open(page, address)
      await expect(page.locator('img[src^="/marks/"]'), address).toHaveCount(2)
      await expect(page.locator('.experience__timeline img'), address).toHaveCount(0)
      const sources = await page.locator('img').evaluateAll((images) => images.map((image) => image.getAttribute('src') ?? ''))
      for (const src of sources)
        expect(src, `${address} ${src}`).toMatch(
          /^(\/marks\/(hopper\.png|bleacher-report\.svg)|\/previews\/(github|appstore-\d+)-[0-9a-f]{12}\.webp|\/favicon\.svg|\/photo\/brad-(64|76|128|152)\.webp)$/,
        )
    }
  })

  test('S4.4 FR-008 the owners line closes the footer of the home and each role page, on its own line, and no other page’s', async ({
    page,
  }) => {
    for (const address of HOMES) {
      await open(page, address)
      const line = page.locator('.ds-footer .ds-footer__owners')
      await expect(line, address).toHaveText(OWNERS_LINE)
      const others = await page
        .locator('.ds-footer > span:not(.ds-footer__owners)')
        .evaluateAll((spans) => Math.max(...spans.map((span) => span.getBoundingClientRect().bottom)))
      expect((await boxOf(line)).y, address).toBeGreaterThanOrEqual(others)
    }
    for (const address of ['/design-system', '/evals', '/privacy']) {
      await open(page, address)
      await expect(page.locator('.ds-footer__owners'), address).toHaveCount(0)
    }
  })
})

test.describe('the site icon (story 5)', () => {
  test('S5.1 S5.2 S5.3 FR-009 the favicon and the home-screen icon are served at their paths, and every page links both', async ({
    page,
  }) => {
    const favicon = await page.request.get('/favicon.svg')
    expect(favicon.status()).toBe(200)
    expect(favicon.headers()['content-type']).toMatch(/^image\/svg\+xml/)
    expect(await favicon.text()).toContain('fill="#0e1116"')
    const touch = await page.request.get('/apple-touch-icon.png')
    expect(touch.status()).toBe(200)
    expect(pngSize(await touch.body())).toEqual({ width: 180, height: 180 })
    for (const address of ['/', '/mobile', '/vindecoded-agents', '/evals', '/privacy', '/design-system', '/no-such-page']) {
      await open(page, address)
      await expect(page.locator('link[rel="icon"][href="/favicon.svg"][type="image/svg+xml"]'), address).toHaveCount(1)
      await expect(page.locator('link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]'), address).toHaveCount(1)
    }
  })
})

test.describe('the photo (story 6)', () => {
  // Each size and density gets its own test, so its browser holds no other size of the photo to reuse.
  for (const [scale, size, viewport, file, side] of [
    [1, 'desktop', DESKTOP, '/photo/brad-76.webp', 76],
    [1, 'phone', PHONE, '/photo/brad-64.webp', 64],
    [2, 'desktop', DESKTOP, '/photo/brad-152.webp', 76],
    [2, 'phone', PHONE, '/photo/brad-128.webp', 64],
  ] as const) {
    test.describe(`on a ${size} at ${scale}x`, () => {
      test.use({ deviceScaleFactor: scale })

      test(`S6.1 FR-010 the photo sits round by "Get in touch", ${side} px, ${size === 'desktop' ? 'beside' : 'above'} the heading, alt naming Brad, ${size} ${scale}x`, async ({
        page,
      }) => {
        await enter(page, { viewport, theme: 'light' })
        await open(page, '/')
        const photo = page.locator('#contact .contact__head > img.contact__photo')
        await expect(photo).toHaveAttribute('alt', 'Brad Thome')
        await expect(photo).toHaveAttribute('loading', 'lazy')
        await photo.scrollIntoViewIfNeeded()
        await expect
          .poll(() =>
            photo.evaluate((image) => {
              const picture = image as unknown as { complete: boolean; naturalWidth: number }
              return picture.complete && picture.naturalWidth > 0
            }),
          )
          .toBe(true)
        expect(new URL(await photo.evaluate((image) => (image as unknown as { currentSrc: string }).currentSrc)).pathname).toBe(file)
        const box = await boxOf(photo)
        const heading = await boxOf(page.locator('#contact-heading'))
        expect([Math.round(box.width), Math.round(box.height)]).toEqual([side, side])
        expect(await photo.evaluate((image) => image.ownerDocument.defaultView?.getComputedStyle(image).borderRadius)).toBe('50%')
        if (size === 'desktop') expect(box.x + box.width).toBeLessThan(heading.x)
        else expect(box.y + box.height).toBeLessThanOrEqual(heading.y)
      })
    })
  }
})

test.describe('the gallery and everything else (stories 7 and 8)', () => {
  test('S7.1 FR-011 the gallery shows the site icon, the side pictures, a mark, the photo, the share cards, and the band’s mark and diagram', async ({
    page,
  }) => {
    await enter(page, { viewport: DESKTOP, theme: 'light' })
    await open(page, '/design-system')
    const pictures = page.locator('#pictures')
    await expect(pictures.locator('.g-tab img[src="/favicon.svg"]')).toHaveCount(2)
    await expect(pictures.locator('.g-home img[src="/apple-touch-icon.png"]')).toHaveCount(1)
    await expect(pictures.locator('.g-badges .g-pic img')).toHaveCount(3)
    await expect(pictures.locator('img.g-mark__mark[src="/marks/bleacher-report.svg"]')).toHaveCount(1)
    await expect(pictures.locator('img.g-photo__photo')).toHaveCount(1)
    await expect(pictures.locator('.g-shares img')).toHaveCount(6)
    await loadPictures(page)
    for (const image of await pictures.locator('.g-shares img').all())
      expect(await image.evaluate((element) => (element as unknown as { naturalWidth: number }).naturalWidth)).toBe(1200)
    const band = page.locator('#pictures-band')
    await expect(band.locator('img.g-band-mark[src="/marks/hopper.png"]')).toHaveCount(1)
    await expect(band.locator('.hopper__figure[data-figure="loop"]')).toHaveCount(1)
  })

  test("S8.2 FR-012 every picture on the home, the role pages and the gallery's new sections has its size set, and this slice's pictures load lazily", async ({
    page,
  }) => {
    for (const address of HOMES) {
      await open(page, address)
      const images = await page.locator('img').evaluateAll((all) =>
        all.map((image) => ({
          src: image.getAttribute('src') ?? '',
          width: image.getAttribute('width'),
          height: image.getAttribute('height'),
          loading: image.getAttribute('loading'),
        })),
      )
      for (const image of images) {
        expect(Number(image.width), `${address} ${image.src}`).toBeGreaterThan(0)
        expect(Number(image.height), `${address} ${image.src}`).toBeGreaterThan(0)
        if (/^\/(marks|photo)\/|appstore-|favicon/.test(image.src)) expect(image.loading, `${address} ${image.src}`).toBe('lazy')
      }
    }
    // The gallery's new sections sit far below its first screen: every picture there has its size and loads lazily.
    await open(page, '/design-system')
    const gallery = await page
      .locator('#pictures img, #pictures-band img')
      .evaluateAll((all) =>
        all.map((image) => [
          image.getAttribute('src'),
          image.getAttribute('width'),
          image.getAttribute('height'),
          image.getAttribute('loading'),
        ]),
      )
    expect(gallery.length).toBeGreaterThan(15)
    for (const [src, width, height, loading] of gallery) {
      expect(Number(width), `${src}`).toBeGreaterThan(0)
      expect(Number(height), `${src}`).toBeGreaterThan(0)
      expect(loading, `${src}`).toBe('lazy')
    }
  })

  // Amended by spec 040 (D238): RealPage's card changes the corpus on purpose, so this pins spec 040's bytes, as spec
  // 038's S3.4 does; this slice's pictures still changed none of them.
  // Amended by spec 041 (D239, D240): spec 041's bytes, as spec 038's S3.4 pins them, and the module grows by its allowance.
  test('S8.3 SC-005 FR-012 the corpus and llms.txt are byte for byte spec 041’s, and the page loads only the one module, the same size as main’s', async ({
    page,
  }) => {
    const sha = async (address: string): Promise<string> =>
      createHash('sha256')
        .update(await (await page.request.get(address)).body())
        .digest('hex')
    // As spec 038's S3.4 pins them: v2.8.0's until spec 040 moved realpage-2's link and added realpage-3.
    // Amended by spec 042 (D242): ten want sources and llms.txt's "Looking for" section join, as spec 038's S3.4 pins too.
    expect(await sha('/corpus.json')).toBe('bc459ae7916503ef30af4e73ab68e891bd23647d78dc0dda44d1a7e9e41c7ffd')
    expect(await sha('/llms.txt')).toBe('2e58951347d397f5608ed4925e9d6ae31b0895c0d7980f82d4e70714fe2bb502')
    await open(page, '/')
    expect(await onlyPreviewScript(page)).toBe(true)
    const src = (await page.locator('script[src]').first().getAttribute('src')) ?? ''
    // Main's module since slice 5.11 made it 29 bytes smaller; this slice adds no script, so it's the same bytes long.
    // Amended by spec 041 (D240): VINDecoded's live numbers join the module, within Brad's 2,304-byte allowance.
    const length = (await (await page.request.get(src)).body()).length
    expect(length).toBeGreaterThan(13_010)
    expect(length - 13_010).toBeLessThanOrEqual(2_304)
  })
})
