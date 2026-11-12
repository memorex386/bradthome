// The hero's live years (spec 036). A role's years are whole years from its
// start month, counted in whole months, so they never round up: from May 2015,
// 11 until the end of Apr 2027, then 12 from May 2027. The build renders the
// count for its own month, so the number is in the HTML for crawlers and with
// no script, and years.client.ts, in the one module, counts again from the
// visitor's clock so the number ticks over without a release. A visitor's
// count only ever raises the built one, so a clock behind the build never
// shows fewer years than the page was built with.

/** Whole years from a start month, YYYY-MM, to a year and month: the whole months between them, over 12, rounded down. */
export function yearsSince(start: string, year: number, month: number): number {
  const [y = 0, m = 0] = start.split('-').map(Number)
  return Math.max(0, Math.floor(((year - y) * 12 + month - m) / 12))
}

/** A count as the figure shows it: whole years with a "+". */
export const figureOf = (years: number): string => `${years}+`

/** A figure on the page: its words, and the month it counts from in data-since. */
export interface Figure {
  textContent: string | null
  dataset: { since?: string }
}

/** Counts each figure again for a day in the visitor's own time, raising any the build left lower and never lowering one. */
export function recount(figures: Iterable<Figure>, day: Date): void {
  for (const figure of figures) {
    const years = yearsSince(figure.dataset.since ?? '', day.getFullYear(), day.getMonth() + 1)
    if (years > Number.parseInt(figure.textContent ?? '', 10)) figure.textContent = figureOf(years)
  }
}
