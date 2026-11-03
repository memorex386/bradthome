import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { describeRun, run, type RunResult } from '../../001/helpers/run.ts'
import { createSandbox, type Sandbox, setEnv } from '../../001/helpers/sandbox.ts'
import { branchEvent, forkEvent, PREVIEW_VARS, TOKEN_ENV } from '../helpers/events.ts'
import { type FakeCli, installFakeCli } from '../helpers/fake-cli.ts'
import { loadPreviewDeploy, type PullRequestEvent } from '../helpers/modules.ts'
import { fixturePath, SCRIPTS } from '../helpers/paths.ts'

// The deploy step's command line (FR-015, FR-017, FR-018, S3.3, S3.4, S3.6,
// V2, V3), run as `node scripts/ci/preview-deploy.ts` from the checkout's
// root, as the deploy job runs it. It reads the event from GITHUB_EVENT_PATH,
// writes firebase.preview.json beside firebase.json before it deploys, runs
// the Firebase CLI from PATH, and hands the link and expiry to the comment job
// through GITHUB_OUTPUT. A fake CLI answers; nothing reaches Google.

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

const LIVE = {
  hosting: {
    public: 'apps/site/dist',
    headers: [{ source: '**', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] }],
  },
}
const PREVIEW_URL = 'https://bradthome--pr-12-a1b2c3d4.web.app'
const EXPIRES = '2026-11-09T15:04:05.000Z'
const SUCCESS = JSON.stringify({ status: 'success', result: { bradthome: { site: 'bradthome', url: PREVIEW_URL, expireTime: EXPIRES } } })
const REFUSED = JSON.stringify({
  status: 'error',
  error:
    'Request to https://firebasehosting.googleapis.com/v1beta1/projects/bradthome/sites/bradthome/channels/pr-12 had HTTP Error: 503, The service is currently unavailable.',
})

interface Deploy {
  result: RunResult
  firebase: FakeCli
  checkout: string
  outputs: Record<string, string>
}

/** GITHUB_OUTPUT's values, written as name=value or name<<DELIMITER blocks. */
function readOutputs(file: string): Record<string, string> {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  const outputs: Record<string, string> = {}
  for (let at = 0; at < lines.length; at++) {
    const line = lines[at] ?? ''
    const block = /^([^=<]+)<<(.+)$/.exec(line)
    if (block) {
      const end = lines.indexOf(block[2] ?? '', at + 1)
      outputs[block[1] ?? ''] = lines.slice(at + 1, end).join('\n')
      at = end
    } else if (line.includes('=')) {
      outputs[line.slice(0, line.indexOf('='))] = line.slice(line.indexOf('=') + 1)
    }
  }
  return outputs
}

function deploy(event: PullRequestEvent, scenario: { stdout: string; status: number }, token = true): Deploy {
  const sandbox = createSandbox()
  sandboxes.push(sandbox)
  const checkout = sandbox.path('checkout')
  mkdirSync(checkout, { recursive: true })
  writeFileSync(path.join(checkout, 'firebase.json'), `${JSON.stringify(LIVE, null, 2)}\n`)
  const eventFile = sandbox.path('event.json')
  writeFileSync(eventFile, JSON.stringify(event))
  const outputFile = sandbox.path('github-output')
  writeFileSync(outputFile, '')
  const firebase = installFakeCli(sandbox, 'firebase', fixturePath('fake-firebase', 'fake-firebase.mjs'), scenario)
  const env = { ...firebase.env, ...PREVIEW_VARS, ...(token ? TOKEN_ENV : {}) }
  setEnv(env, 'GITHUB_EVENT_NAME', 'pull_request')
  setEnv(env, 'GITHUB_EVENT_PATH', eventFile)
  setEnv(env, 'GITHUB_OUTPUT', outputFile)
  setEnv(env, 'RUNNER_TEMP', sandbox.path())
  const result = run(process.execPath, [SCRIPTS.previewDeploy], { cwd: checkout, env })
  return { result, firebase, checkout, outputs: readOutputs(outputFile) }
}

/** Whether every item of part appears in whole, in the same order. */
function inOrder(whole: readonly string[], part: readonly string[]): boolean {
  let at = 0
  for (const item of whole) if (item === part[at]) at++
  return at === part.length
}

describe('V2: a skip passes the job', () => {
  test("S3.3 FR-017 V2 a fork's pull request exits 0 with the reason, and never calls the CLI", async () => {
    const { previewSkip } = await loadPreviewDeploy()
    const { result, firebase, outputs } = deploy(forkEvent(), { stdout: SUCCESS, status: 0 })
    expect(result.status, describeRun(result)).toBe(0)
    for (const line of previewSkip(forkEvent(), { ...TOKEN_ENV }) ?? ['missing']) expect(result.stdout, describeRun(result)).toContain(line)
    expect(firebase.calls()).toEqual([])
    expect(outputs.url ?? '').toBe('')
  })

  test('S3.3 FR-017 V2 a run with no identity token exits 0 with the reason, and never calls the CLI', async () => {
    const { previewSkip } = await loadPreviewDeploy()
    const { result, firebase, outputs } = deploy(branchEvent(), { stdout: SUCCESS, status: 0 }, false)
    expect(result.status, describeRun(result)).toBe(0)
    for (const line of previewSkip(branchEvent(), {}) ?? ['missing']) expect(result.stdout, describeRun(result)).toContain(line)
    expect(firebase.calls()).toEqual([])
    expect(outputs.url ?? '').toBe('')
  })
})

describe('a deploy', () => {
  test('S3.6 FR-015 FR-018 V1 deploys pull request 12 to its channel with the noindex config, and hands on the link and expiry', async () => {
    const { deployArgs, previewConfig } = await loadPreviewDeploy()
    const { result, firebase, checkout, outputs } = deploy(branchEvent(12), { stdout: SUCCESS, status: 0 })
    expect(result.status, describeRun(result)).toBe(0)
    const calls = readFileSync(path.join(firebase.bin, 'calls.jsonl'), 'utf8')
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line) as { args: string[]; configText: string | null })
    expect(calls).toHaveLength(1)
    const call = calls[0] ?? { args: [], configText: null }
    expect(inOrder(call.args, deployArgs(12)), call.args.join(' ')).toBe(true)
    expect(call.configText, 'firebase.preview.json existed when the CLI ran').not.toBeNull()
    expect(JSON.parse(call.configText ?? 'null')).toEqual(previewConfig(LIVE))
    expect(JSON.parse(readFileSync(path.join(checkout, 'firebase.json'), 'utf8'))).toEqual(LIVE)
    expect(outputs.url).toBe(PREVIEW_URL)
    expect(outputs.expires).toBe(EXPIRES)
  })

  test("S3.4 FR-017 V3 Hosting's refusal fails the job, printing V3's lines", async () => {
    const { deployOutcome } = await loadPreviewDeploy()
    const { result, outputs } = deploy(branchEvent(12), { stdout: REFUSED, status: 1 })
    expect(result.status, describeRun(result)).not.toBe(0)
    const expected = deployOutcome(REFUSED, 1)
    for (const line of expected.ok ? ['missing'] : expected.lines) expect(`${result.stdout}${result.stderr}`, describeRun(result)).toContain(line)
    expect(outputs.url ?? '').toBe('')
  })
})
