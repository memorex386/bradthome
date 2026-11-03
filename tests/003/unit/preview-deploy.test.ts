import { describe, expect, test } from 'vitest'
import { loadPreviewDeploy } from '../helpers/modules.ts'

// The channel deploy (FR-015, FR-017, FR-018, S3.4, S3.6, V3): the Firebase
// CLI deploys pull request N to the channel pr-N, which expires 7 days after
// the push, with the noindex copy of the config. Its --json output gives the
// link, or V3's message when Hosting refuses. The preview sits outside the
// gate, so a failed deploy never changes the gate's result.

/** What firebase-tools 15 prints with --json, with made-up values. */
const SUCCESS = JSON.stringify({
  status: 'success',
  result: { bradthome: { site: 'bradthome', url: 'https://bradthome--pr-12-a1b2c3d4.web.app', expireTime: '2026-11-09T15:04:05.000Z' } },
})
const REFUSED = JSON.stringify({
  status: 'error',
  error:
    'Request to https://firebasehosting.googleapis.com/v1beta1/projects/bradthome/sites/bradthome/channels/pr-12 had HTTP Error: 503, The service is currently unavailable.',
})
const SIGN_IN = JSON.stringify({ status: 'error', error: 'Failed to authenticate, have you run firebase login?' })
const V3_TAIL = "  The gate isn't affected. Fix: re-run the job; if it keeps failing, check Google Cloud's status."

describe("the CLI's arguments", () => {
  test('S3.6 FR-015 FR-017 deploys pull request N to the channel pr-N, expiring in 7 days, with the noindex config', async () => {
    const { deployArgs } = await loadPreviewDeploy()
    const args = deployArgs(12)
    expect(args.slice(0, 2)).toEqual(['hosting:channel:deploy', 'pr-12'])
    expect(args[args.indexOf('--expires') + 1]).toBe('7d')
    expect(args[args.indexOf('--config') + 1]).toBe('firebase.preview.json')
    expect(args).toContain('--json')
    expect(args.some((arg) => /^live$|^deploy$|^--only$/.test(arg))).toBe(false)
    expect(deployArgs(7)[1]).toBe('pr-7')
  })

  test('S3.5 FR-017 refuses any channel name but a pull request number, so it can never name live', async () => {
    const { deployArgs } = await loadPreviewDeploy()
    for (const bad of [0, -1, 1.5, Number.NaN]) expect(() => deployArgs(bad), String(bad)).toThrow()
  })
})

describe("the CLI's outcome", () => {
  test("S3.6 FR-015 V1 a deploy gives the channel's link and when it expires", async () => {
    const { deployOutcome } = await loadPreviewDeploy()
    expect(deployOutcome(SUCCESS, 0)).toEqual({ ok: true, url: 'https://bradthome--pr-12-a1b2c3d4.web.app', expires: '2026-11-09T15:04:05.000Z' })
  })

  test("S3.4 FR-017 V3 Hosting's refusal fails the job with the error and how to retry, in the mock's words", async () => {
    const { deployOutcome } = await loadPreviewDeploy()
    expect(deployOutcome(REFUSED, 1)).toEqual({
      ok: false,
      lines: ['✖ preview  Firebase Hosting refused the deploy', '  HTTP 503 from firebasehosting.googleapis.com', V3_TAIL],
    })
  })

  test("S3.4 FR-017 V3 a sign-in failure shows the CLI's own error, and the same way to retry", async () => {
    const { deployOutcome } = await loadPreviewDeploy()
    const outcome = deployOutcome(SIGN_IN, 1)
    expect(outcome.ok).toBe(false)
    const lines = outcome.ok ? [] : outcome.lines
    expect(lines[0]).toMatch(/^✖ preview {2}\S/)
    expect(lines.join('\n')).toContain('Failed to authenticate, have you run firebase login?')
    expect(lines.at(-1)).toBe(V3_TAIL)
  })

  test('S3.4 FR-017 V3 output that isn\'t JSON, or a failing exit with a success body, still fails with the fix', async () => {
    const { deployOutcome } = await loadPreviewDeploy()
    for (const [stdout, status] of [
      ['Error: something unexpected', 1],
      ['', 1],
      [SUCCESS, 1],
      ['', null],
    ] as const) {
      const outcome = deployOutcome(stdout, status)
      expect(outcome.ok, `${stdout} ${String(status)}`).toBe(false)
      if (!outcome.ok) {
        expect(outcome.lines[0]).toMatch(/^✖ preview {2}\S/)
        expect(outcome.lines.at(-1)).toBe(V3_TAIL)
      }
    }
  })
})

describe("the preview's config", () => {
  test('S3.6 FR-018 adds X-Robots-Tag: noindex on every path, and keeps every live header', async () => {
    const { previewConfig } = await loadPreviewDeploy()
    const live = {
      hosting: {
        public: 'apps/site/dist',
        headers: [{ source: '**', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] }],
      },
    }
    const copy = JSON.stringify(live)
    const preview = previewConfig(live) as typeof live
    expect(JSON.stringify(live)).toBe(copy)
    const everyPath = preview.hosting.headers.find((rule) => rule.source === '**')?.headers ?? []
    expect(everyPath).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex' })
    expect(everyPath).toContainEqual({ key: 'X-Content-Type-Options', value: 'nosniff' })
    expect(preview.hosting.public).toBe('apps/site/dist')
  })
})
