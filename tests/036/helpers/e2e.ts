import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { parse } from 'yaml'
import { DETAILS, TILES } from '../../../apps/site/src/components/home/hero.ts'
import { barOf, builtYears, timelineOf } from '../../../apps/site/src/components/home/tiles.ts'
import { figureOf } from '../../../apps/site/src/components/home/years.ts'

// Spec 036's browser helpers. The hero's years, its tiles' bars and the
// detail's timeline are drawn for the build's month, so a snapshot taken a
// month later would differ by a pixel; steadyHero holds them to one day,
// FIXED_DAY, as spec 033's steadyRecords holds its counts. tests/010's
// hideFrame calls it before every element shot of the home and role pages.

/** The day the snapshots are held to: the slice's Gate 1. */
export const FIXED_DAY = new Date('2026-11-12T18:00:00Z')

const CONTENT = path.resolve(import.meta.dirname, '../../../apps/site/content')

/** The jobs' files, as the timeline reads them. */
export function jobsOf(): { id: string; company: string; start: string; end: string }[] {
  const folder = path.join(CONTENT, 'jobs')
  return readdirSync(folder)
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => {
      const job = parse(readFileSync(path.join(folder, name), 'utf8')) as { company: string; start: string; end: string }
      return { id: name.slice(0, -'.yaml'.length), company: job.company, start: job.start, end: job.end }
    })
}

/** The career's first month, where every tile's bar starts. */
export const careerStart = (): string =>
  jobsOf()
    .map((job) => job.start)
    .sort()[0] ?? '2008-01'

/** What the page draws for a day: each figure's words, each bar's place, and each role's timeline. */
export function drawnFor(day: Date): {
  figures: Record<string, string>
  bars: Record<string, { x: number; width: number }>
  timelines: Record<string, { jobs: { x: number; width: number }[]; side?: { x: number; width: number } }>
} {
  const jobs = new Map(jobsOf().map((job) => [job.id, job]))
  const figures: Record<string, string> = {}
  const bars: Record<string, { x: number; width: number }> = {}
  const timelines: Record<string, { jobs: { x: number; width: number }[]; side?: { x: number; width: number } }> = {}
  for (const tile of TILES) {
    if (tile.since === undefined) continue
    figures[tile.since] = figureOf(builtYears(tile.since, day))
    bars[tile.role] = barOf(tile.since, careerStart(), day)
    const detail = DETAILS[tile.role]
    const line = timelineOf(
      detail.jobs.map((id) => jobs.get(id) ?? { id, company: id, start: '2000-01', end: '2000-01' }),
      detail.side === undefined ? undefined : { label: detail.side.label, since: detail.side.since },
      day,
    )
    timelines[tile.role] = {
      jobs: line.jobs.map(({ x, width }) => ({ x, width })),
      side: line.side && { x: line.side.x, width: line.side.width },
    }
  }
  return { figures, bars, timelines }
}

/**
 * Holds the hero's years, bars and timelines to FIXED_DAY, so a snapshot
 * doesn't move with the build's month. With `figures` false it leaves the
 * years as the page shows them, for a shot of the one module's own count.
 */
export async function steadyHero(page: Page, day: Date = FIXED_DAY, figures = true): Promise<void> {
  const drawn = drawnFor(day)
  await page.evaluate(`(() => {
    const drawn = ${JSON.stringify(drawn)}
    if (${figures}) for (const figure of document.querySelectorAll('[data-since]')) figure.textContent = drawn.figures[figure.dataset.since] ?? figure.textContent
    for (const tile of document.querySelectorAll('.hero__tile')) {
      const bar = drawn.bars[(tile.id || '').replace('tile-', '')]
      if (!bar) continue
      for (const rect of tile.querySelectorAll('.hero__bar-years, .hero__bar-sweep')) { rect.setAttribute('x', bar.x); rect.setAttribute('width', bar.width) }
    }
    for (const detail of document.querySelectorAll('.hero__detail')) {
      const line = drawn.timelines[detail.dataset.role]
      if (!line) continue
      detail.querySelectorAll('.hero__job').forEach((rect, i) => {
        const job = line.jobs[i]
        if (job) { rect.setAttribute('x', job.x); rect.setAttribute('width', Math.max(job.width - 0.4, 0.4)) }
      })
      const side = detail.querySelector('.hero__side')
      if (side && line.side) { side.setAttribute('x', line.side.x); side.setAttribute('width', line.side.width) }
    }
  })()`)
}

/**
 * Serves every page with its built years as of FIXED_DAY, before the one
 * module counts again from the page's clock, so a shot at a later date shows
 * the module's own count, the same whenever the site was built.
 */
export async function builtOn(page: Page, day: Date = FIXED_DAY): Promise<void> {
  const { figures } = drawnFor(day)
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback()
    const response = await route.fetch()
    const body = (await response.text()).replace(/(data-since="([\d-]+)">)\d+\+</g, (match: string, open: string, since: string) =>
      figures[since] === undefined ? match : `${open}${figures[since]}<`,
    )
    const headers = Object.fromEntries(Object.entries(response.headers()).filter(([name]) => name !== 'content-encoding' && name !== 'content-length'))
    await route.fulfill({ status: response.status(), headers, body })
  })
}

/** The tiles in order, each with its name, link, mark and box. */
export async function tilesOf(
  page: Page,
): Promise<{ name: string; href: string; current: string | null; top: number; left: number; height: number; width: number }[]> {
  return (await page.evaluate(`[...document.querySelectorAll('.hero__tile')].map((a) => {
    const r = a.getBoundingClientRect()
    return { name: a.querySelector('.hero__tile-name').textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current'), top: Math.round(r.top + scrollY), left: Math.round(r.left), height: r.height, width: r.width }
  })`)) as never
}

/** The bottom of an element on the page, in CSS pixels from the page's top. */
export async function bottomOf(page: Page, selector: string): Promise<number> {
  return (await page.evaluate(
    `(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return Math.round(r.bottom + scrollY) })()`,
  )) as number
}

/** Counts layout shifts from the page's start, in window.__shift. */
export async function watchShifts(page: Page): Promise<void> {
  await page.addInitScript(
    `window.__shift = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shift += e.value }).observe({ type: 'layout-shift', buffered: true })`,
  )
}
