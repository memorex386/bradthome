import { readdirSync } from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

// Spec 033's helpers for the end-to-end tests: the repo's records counted on
// their own, and the steady values every snapshot shows in place of the
// build's counts and date (S5.4), so a new record or a new day never changes
// a baseline. Specs 010 and 013 use steadyRecords before their shots of the
// whole home and of "On the side".

export const CARD = '#side-bradthome-com'
const ROOT = path.resolve(import.meta.dirname, '../../..')

/** The checkout's records, counted here without record.ts. */
export function repoCounts(): { decisions: number; specs: number; releases: number } {
  const entries = (folder: string) => readdirSync(path.join(ROOT, folder), { withFileTypes: true })
  return {
    decisions: entries('docs/decisions').filter((entry) => entry.isFile() && /^\d{4}-.+\.md$/.test(entry.name)).length,
    specs: entries('specs').filter((entry) => entry.isDirectory() && /^\d{3}-/.test(entry.name)).length,
    releases: entries('docs/releases').filter((entry) => entry.isFile() && /^v\d+\.\d+\.\d+\.md$/.test(entry.name)).length,
  }
}

/** The values the snapshots show: the counts and the day of spec 033's mocks. */
export const STEADY = { decisions: '214', specs: '31', releases: '8', counted: 'Nov 11, 2026', datetime: '2026-11-11' } as const

/** Sets every build-dated value on the page to its steady value. */
export async function steadyRecords(page: Page): Promise<void> {
  await page.evaluate(`(() => {
    const steady = ${JSON.stringify(STEADY)}
    for (const el of document.querySelectorAll('[data-record]')) {
      const kind = el.getAttribute('data-record')
      if (kind in steady) el.textContent = steady[kind]
      if (kind === 'counted') el.setAttribute('datetime', steady.datetime)
    }
  })()`)
}
