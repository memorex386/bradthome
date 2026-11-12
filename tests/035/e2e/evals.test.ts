import { expect, test } from '@playwright/test'

// Spec 035, Story 3 in the browser: every judge's note on the built /evals
// calls Brad "Brad", closed cases included, and "How it works" says how the
// notes' words differ from the judge's. Spec 003's settings apply.

test('S3.1 SC-002 no judge’s note on /evals holds he, him, his or himself', async ({ page }) => {
  await page.goto('/evals')
  // textContent reads the closed cases too, which innerText would skip.
  const notes = await page.locator('.evals__judge').allTextContents()
  expect(notes.length).toBeGreaterThan(0)
  for (const note of notes) expect(note).not.toMatch(/\b(?:he|him|his|himself)\b/i)
})

test('S3.3 FR-006 How it works says the notes are the judge’s words, with Brad’s name for each pronoun', async ({ page }) => {
  await page.goto('/evals')
  await expect(
    page
      .locator('.evals__list li')
      .filter({ hasText: 'The judge’s notes are its own words, except that each pronoun for Brad becomes Brad’s name' }),
  ).toHaveCount(1)
})
