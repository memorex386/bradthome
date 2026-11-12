import { describe, expect, test } from 'vitest'
import { barOf, builtYears, legendYearsOf, monthNow, timelineOf } from '../../../apps/site/src/components/home/tiles.ts'
import { type Figure, figureOf, recount, yearsSince } from '../../../apps/site/src/components/home/years.ts'

// Spec 036's years, unit by unit: whole years in whole months from a start
// month, never rounded up (SC-001), the anniversaries (S2.3), a clock behind
// the build (S2.4), the build's own month in Dallas–Fort Worth's time (S2.2),
// and the pictures' places (S3.2).

const MOBILE = '2015-05'
const FULLSTACK = '2016-09'

/** A figure as the page holds it: the built count, and its start month. */
const figure = (text: string, since: string): Figure => ({ textContent: text, dataset: { since } })

/** A day in Dallas–Fort Worth, at noon, so no time zone moves it to another month. */
const day = (iso: string): Date => new Date(`${iso}T12:00:00-06:00`)

describe('whole years from a start month (story 2)', () => {
  test('SC-001 FR-002 S2.1 every month from the start to Dec 2040 counts whole months over 12, rounded down', () => {
    for (const [start, y0, m0] of [
      [MOBILE, 2015, 5],
      [FULLSTACK, 2016, 9],
    ] as const) {
      for (let year = y0; year <= 2040; year++) {
        for (let month = 1; month <= 12; month++) {
          const months = (year - y0) * 12 + (month - m0)
          if (months < 0) continue
          expect(yearsSince(start, year, month), `${start} at ${year}-${month}`).toBe(Math.floor(months / 12))
        }
      }
    }
  })

  test('S2.1 Nov 2026 shows 11+ for mobile and 10+ for full-stack', () => {
    expect(figureOf(yearsSince(MOBILE, 2026, 11))).toBe('11+')
    expect(figureOf(yearsSince(FULLSTACK, 2026, 11))).toBe('10+')
  })

  test('S2.3 SC-001 the anniversaries: mobile turns 12+ in May 2027, full-stack 11+ in Sep 2027, never a month early', () => {
    expect(yearsSince(MOBILE, 2027, 4)).toBe(11)
    expect(yearsSince(MOBILE, 2027, 5)).toBe(12)
    expect(yearsSince(FULLSTACK, 2027, 8)).toBe(10)
    expect(yearsSince(FULLSTACK, 2027, 9)).toBe(11)
    expect(yearsSince(MOBILE, 2030, 11)).toBe(15)
    expect(yearsSince(FULLSTACK, 2030, 11)).toBe(14)
  })

  test('S2.1 a day before the start counts 0, never less', () => {
    expect(yearsSince(MOBILE, 2015, 4)).toBe(0)
    expect(yearsSince(MOBILE, 2010, 1)).toBe(0)
  })
})

describe("the visitor's count (S2.3, S2.4)", () => {
  test("S2.3 FR-002 a visitor's clock raises the built count on an anniversary", () => {
    const shown = [figure('11+', MOBILE), figure('10+', FULLSTACK)]
    recount(shown, new Date(2027, 4, 1, 9))
    expect(shown.map((f) => f.textContent)).toEqual(['12+', '10+'])
    recount(shown, new Date(2027, 8, 1, 9))
    expect(shown.map((f) => f.textContent)).toEqual(['12+', '11+'])
  })

  test('S2.3 the day before each anniversary leaves the built count as it is', () => {
    const shown = [figure('11+', MOBILE), figure('10+', FULLSTACK)]
    recount(shown, new Date(2027, 3, 30, 23, 59))
    expect(shown.map((f) => f.textContent)).toEqual(['11+', '10+'])
    recount(shown, new Date(2027, 7, 31, 23, 59))
    expect(shown.map((f) => f.textContent)).toEqual(['12+', '10+'])
  })

  test('S2.4 SC-001 FR-002 a clock behind the build never lowers a count', () => {
    const shown = [figure('12+', MOBILE), figure('11+', FULLSTACK)]
    recount(shown, new Date(2026, 0, 15))
    expect(shown.map((f) => f.textContent)).toEqual(['12+', '11+'])
    recount(shown, new Date(1999, 0, 1))
    expect(shown.map((f) => f.textContent)).toEqual(['12+', '11+'])
  })

  test('S2.3 it counts in the visitor’s own month, from the Date’s local fields', () => {
    const shown = [figure('11+', MOBILE)]
    // The first minute of May in the visitor's own time zone, whatever the runner's is.
    recount(shown, new Date(2027, 4, 1, 0, 1))
    expect(shown[0]?.textContent).toBe('12+')
  })
})

describe("the build's count (S2.2)", () => {
  test("S2.2 FR-002 the build counts for its own month in Dallas–Fort Worth's time", () => {
    expect(monthNow(new Date('2026-11-12T17:00:00Z'))).toEqual([2026, 11])
    // 2027-05-01 03:00 UTC is still Apr 30 in Dallas–Fort Worth.
    expect(monthNow(new Date('2027-05-01T03:00:00Z'))).toEqual([2027, 4])
    expect(builtYears(MOBILE, new Date('2027-05-01T03:00:00Z'))).toBe(11)
    expect(builtYears(MOBILE, new Date('2027-05-01T12:00:00Z'))).toBe(12)
    expect(builtYears(FULLSTACK, day('2026-11-12'))).toBe(10)
  })
})

describe("the pictures' places (S3.2, S4.1)", () => {
  test("S4.1 S3.2 a tile's years bar runs from the career's first month to now, the role's years at its end", () => {
    const bar = barOf(MOBILE, '2008-11', day('2026-11-12'))
    // Nov 2008 to the end of Nov 2026 is 217 months; May 2015 starts 78 months in.
    expect(bar.x).toBe(Math.round((78 / 217) * 10000) / 100)
    expect(bar.x + bar.width).toBeCloseTo(100, 1)
  })

  test("S3.2 FR-004 the detail's timeline places each job and the side project from the January of the first start to now", () => {
    const line = timelineOf(
      [
        { id: 'bottle-rocket', company: 'Bottle Rocket', start: '2015-10', end: '2017-11' },
        { id: 'hopper', company: 'Hopper', start: '2022-04', end: '2026-10' },
      ],
      { label: 'VINDecoded, on the side', since: MOBILE },
      day('2026-11-12'),
    )
    expect(line.from).toBe(2015)
    const span = 2026 * 12 + 11 - 2015 * 12
    expect(line.side?.x).toBe(Math.round((4 / span) * 10000) / 100)
    expect((line.side?.x ?? 0) + (line.side?.width ?? 0)).toBeCloseTo(100, 1)
    expect(line.jobs[0]?.x).toBe(Math.round((9 / span) * 10000) / 100)
    expect(line.jobs[0]?.width).toBe(Math.round((26 / span) * 10000) / 100)
    expect(line.jobs[1]?.width).toBe(Math.round((55 / span) * 10000) / 100)
  })

  test('S3.2 the legend gives each stretch its years, and the side project runs to now', () => {
    expect(legendYearsOf('2015-10', '2017-11')).toBe('2015 – 2017')
    expect(legendYearsOf('2017-11', '2017-12')).toBe('2017')
    expect(legendYearsOf(MOBILE, 'present')).toBe('2015 – now')
  })
})
