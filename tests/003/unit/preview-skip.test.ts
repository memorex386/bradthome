import { describe, expect, test } from 'vitest'
import { branchEvent, deletedForkEvent, dependabotEvent, forkEvent, TOKEN_ENV } from '../helpers/events.ts'
import { loadPreviewDeploy } from '../helpers/modules.ts'

// When the preview skips (FR-017, S3.3, V2). A fork's pull request gets no
// identity token, so it gets no Google sign-in, and the deploy job says so and
// passes. A run that GitHub gives no token, which may be Dependabot's (plan,
// fact 3), skips the same way. Every other check still runs.

const V2_FORK = [
  '– preview  skipped: this pull request comes from a fork, so GitHub gives it no Google sign-in.',
  '  Checks still run.',
]

describe('V2: the preview skips with its reason', () => {
  test("S3.3 FR-017 V2 a fork's pull request skips, in the mock's words", async () => {
    const { previewSkip } = await loadPreviewDeploy()
    expect(previewSkip(forkEvent(), { ...TOKEN_ENV })).toEqual(V2_FORK)
    expect(previewSkip(forkEvent(), {})).toEqual(V2_FORK)
  })

  test('S3.3 FR-017 V2 a pull request from a fork that no longer exists skips the same way', async () => {
    const { previewSkip } = await loadPreviewDeploy()
    expect(previewSkip(deletedForkEvent(), { ...TOKEN_ENV })).toEqual(V2_FORK)
  })

  test('S3.3 FR-017 V2 a run with no identity token skips, saying so, even from a branch in the repo', async () => {
    const { previewSkip } = await loadPreviewDeploy()
    for (const event of [branchEvent(), dependabotEvent()]) {
      const lines = previewSkip(event, {}) ?? []
      expect(lines[0]).toMatch(/^– preview {2}skipped: .*\bidentity token\b/)
      expect(lines[0]).not.toMatch(/fork/)
      expect(lines.at(-1)).toBe('  Checks still run.')
    }
    expect(previewSkip(branchEvent(), { ACTIONS_ID_TOKEN_REQUEST_URL: TOKEN_ENV.ACTIONS_ID_TOKEN_REQUEST_URL })).toBeDefined()
  })

  test("S3.3 FR-017 a branch in the repo with a token deploys, and so does Dependabot's when GitHub gives it one", async () => {
    const { previewSkip } = await loadPreviewDeploy()
    expect(previewSkip(branchEvent(), { ...TOKEN_ENV })).toBeUndefined()
    expect(previewSkip(dependabotEvent(), { ...TOKEN_ENV })).toBeUndefined()
  })
})
