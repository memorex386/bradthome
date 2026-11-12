import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { parseResults } from '../../../apps/evals/src/results.ts'
import { sinceNoteOf, sinceOf } from '../../../apps/site/src/components/evals/evals.ts'
import { fingerprintOf } from '../../../scripts/lib/fingerprint.ts'
import { FIXED_TIME } from '../../003/helpers/e2e.ts'
import { DESKTOP, enter, PHONE } from '../../010/helpers/e2e.ts'

// Spec 037's /evals in the browser (Story 6): the note under the verdict says
// what changed in the code since the committed full run, read from the same
// checkout, at WCAG 2.2 AA in both themes, and its baselines in the pinned
// container. Baselines come from pnpm test:visual tests/037 --update.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const real = (file: string): string | undefined => {
  try {
    return readFileSync(path.join(ROOT, file), 'utf8')
  } catch {
    return undefined
  }
}
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** What the note should say for this checkout: the committed run against the code's fingerprint, and a changed run, if one is committed. */
function expectedNote(): string | undefined {
  const run = parseResults(JSON.parse(real('apps/evals/results.json') ?? '{}'))
  const changedText = real('apps/evals/changed.json')
  const since = sinceOf(run, fingerprintOf(real), changedText === undefined ? undefined : parseResults(JSON.parse(changedText)))
  return since === undefined ? undefined : sinceNoteOf(since)
}

test('S6.1 S6.3 FR-007 /evals says what changed in the code since its run, under the verdict, or nothing when nothing did', async ({ page }) => {
  await enter(page, { viewport: DESKTOP, theme: 'light' })
  await page.goto('/evals')
  const note = expectedNote()
  if (note === undefined) {
    await expect(page.locator('.evals__since')).toHaveCount(0)
    return
  }
  const since = page.locator('.evals__summary .evals__verdict + .evals__since')
  await expect(since).toHaveCount(1)
  await expect(since).toContainText(note)
})

for (const theme of ['light', 'dark'] as const) {
  test(`S6.5 FR-007 /evals with its note has no violation at WCAG 2.2 AA, phone and desktop, ${theme}`, async ({ page }) => {
    for (const viewport of [PHONE, DESKTOP]) {
      await enter(page, { viewport, theme })
      await page.goto('/evals')
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
      expect(results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id} at ${node.target.join(' ')}`))).toEqual([])
    }
  })

  for (const [size, viewport] of [
    ['phone', PHONE],
    ['desktop', DESKTOP],
  ] as const) {
    test(`S6.5 S6.1 M1 /evals's summary, verdict and note match their baseline, ${size} ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(FIXED_TIME)
      await enter(page, { viewport, theme })
      await page.goto('/evals')
      await page.evaluate('document.fonts.ready.then(() => undefined)')
      await expect(page.locator('.evals__summary')).toHaveScreenshot(`summary-${size}-${theme}.png`)
    })
  }
}
