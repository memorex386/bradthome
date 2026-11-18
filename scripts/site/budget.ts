// The home's byte budget (spec 043, D246). The first network round trip
// carries about 14.6 KB, and the home's HTML must arrive whole before its hero
// paints, so a home past it paints a round trip late in Lighthouse's phone.
// 14,000 bytes with brotli leaves room for the headers. Moving it is Brad's call.

export const HOME_BUDGET = 14_000

/** The message for a home over budget, in the shape of spec 001's messages. */
export function budgetMessage(size: number): string[] {
  return [
    `✖ budget  the home's HTML is ${size.toLocaleString('en-US')} bytes with brotli, over the ${HOME_BUDGET.toLocaleString('en-US')}-byte budget (D246)`,
    '  apps/site/dist/index.html',
    "  Fix: slim the home's HTML, or ask Brad to move the budget.",
  ]
}
