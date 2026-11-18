import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../../apps/chat-api/src/app.ts'
import { createPulse, type Fetcher, memoryPulseStore, type PulseStore, SOURCES } from '../../../apps/chat-api/src/pulse.ts'
import { deploy, problemsOf, RETIRED_ENV, type RunResult } from '../../../scripts/chat-api/deploy.ts'
import { ALTCHA_KEY, CORPUS, fakeModel, fakeStore } from '../../021/helpers/fakes.ts'

// Spec 044, Story 2: /pulse answers the App Store alone, nothing in the API
// reads a GitHub token or repo, and the deploy mounts no pulse secret and
// refuses a service that still holds one (D247). Apple is a fake here.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')
const NOW = Date.parse('2026-11-18T15:12:00Z')
const LOOKUP = { results: [{ version: '12.7.9', currentVersionReleaseDate: '2026-11-17T17:02:11Z', averageUserRating: 4.7, userRatingCount: 3254 }] }

function files(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir)).flatMap((name) => {
    const rel = path.join(dir, name)
    return statSync(path.join(ROOT, rel)).isDirectory() ? files(rel) : [rel]
  })
}

describe('/pulse', () => {
  test('S2.1 FR-003 the answer is the App Store alone, never a github key, even with an old GitHub document in the store', async () => {
    const calls: string[] = []
    const fetch: Fetcher = async (url) => {
      calls.push(url)
      return { ok: true, status: 200, json: async () => LOOKUP }
    }
    // Spec 041's cache may still hold a GitHub document; the API never reads it.
    const store = memoryPulseStore() as PulseStore & { cache: Record<string, unknown> }
    store.cache.github = { data: { merged: 296 }, fetched: NOW - 1000, tried: NOW - 1000 }
    const pulse = createPulse({ store, fetch, now: () => NOW })
    const app = createApp({
      model: fakeModel(),
      modelId: 'claude-haiku-5-5',
      store: fakeStore().store,
      corpus: CORPUS,
      altchaKey: ALTCHA_KEY,
      write: () => {},
      pulse,
    })
    const response = await app.request('/pulse', { headers: { origin: 'https://bradthome.com' } })
    const body = (await response.json()) as Record<string, unknown>
    expect(Object.keys(body)).toEqual(['appStore'])
    expect(JSON.stringify(body)).not.toMatch(/github|merged|296/i)
    expect(calls.every((url) => new URL(url).hostname === 'itunes.apple.com')).toBe(true)
    expect(SOURCES).toEqual(['appstore'])
  })

  test("S2.2 FR-003 nothing in the API or the deploy reads a GitHub token or repo, calls GitHub's API, or names the old secrets", () => {
    for (const file of [...files('apps/chat-api/src'), 'scripts/chat-api/deploy.ts']) {
      const text = read(file)
      expect(text, file).not.toMatch(/api\.github\.com|pulse-github-token|pulse-github-repo|PULSE_SECRETS|Authorization: `Bearer/)
      // The deploy names the old variables only to refuse a service that still holds them.
      if (!file.endsWith('deploy.ts')) expect(text, file).not.toMatch(/PULSE_GITHUB_(TOKEN|REPO)/)
    }
    expect(read('apps/chat-api/src/log.ts')).not.toMatch(/'github'/)
  })
})

describe('the deploy', () => {
  const SHA = 'c'.repeat(40)
  const ok = (stdout = ''): RunResult => ({ status: 0, stdout, stderr: '' })
  const DESCRIBE = 'gcloud run services describe chat-api --region=us-central1 --project=bradthome --format=json'
  type Env = { name: string; value?: string; valueFrom?: { secretKeyRef: { name: string; key: string } } }
  const described = (extra: Env[] = []) => ({
    metadata: { name: 'chat-api', labels: { 'cloud.googleapis.com/location': 'us-central1' } },
    spec: {
      template: {
        metadata: { annotations: { 'autoscaling.knative.dev/maxScale': '2' } },
        spec: {
          serviceAccountName: 'chat-api@bradthome.iam.gserviceaccount.com',
          timeoutSeconds: 120,
          containers: [
            {
              env: [
                { name: 'CHAT_MODEL', value: 'claude-haiku-5-5' },
                { name: 'ALTCHA_KEY', valueFrom: { secretKeyRef: { name: 'chat-altcha-key', key: 'latest' } } },
                ...extra,
              ],
            },
          ],
        },
      },
    },
  })

  test('S2.3 FR-003 the deploy asks for no pulse secret and mounts ALTCHA_KEY alone', async () => {
    const calls: string[] = []
    const code = await deploy([], {
      root: path.resolve('/repo'),
      run: (command, args) => {
        const line = [command, ...args].join(' ')
        calls.push(line)
        const answers: Record<string, RunResult> = {
          'git status --porcelain': ok(),
          'git fetch origin main': ok(),
          'git merge-base --is-ancestor HEAD origin/main': ok(),
          'git rev-parse HEAD': ok(`${SHA}\n`),
          [DESCRIBE]: ok(JSON.stringify(described())),
        }
        const answer = answers[line] ?? (line.startsWith('gcloud run deploy ') ? ok() : undefined)
        if (answer === undefined) throw new Error(`unexpected command: ${line}`)
        return answer
      },
      fetchCorpus: async () => JSON.stringify(CORPUS),
      writeFile: () => {},
      print: () => {},
      readRepo: (file) => {
        try {
          return read(file)
        } catch {
          return undefined
        }
      },
    })
    expect(code).toBe(0)
    expect(calls.some((line) => line.startsWith('gcloud secrets'))).toBe(false)
    const deployLine = calls.find((line) => line.startsWith('gcloud run deploy ')) ?? ''
    expect(deployLine).toContain('--set-secrets=ALTCHA_KEY=chat-altcha-key:latest ')
    expect(deployLine).not.toMatch(/PULSE_GITHUB|pulse-github/)
  })

  test('S2.3 FR-003 the read-back fails while the service still holds either old variable, in any form', () => {
    expect(RETIRED_ENV).toEqual(['PULSE_GITHUB_TOKEN', 'PULSE_GITHUB_REPO'])
    expect(problemsOf(described())).toEqual([])
    const mounted = problemsOf(
      described([{ name: 'PULSE_GITHUB_TOKEN', valueFrom: { secretKeyRef: { name: 'pulse-github-token', key: 'latest' } } }]),
    )
    expect(mounted).toEqual(['PULSE_GITHUB_TOKEN is set, though the API reads nothing of GitHub'])
    expect(problemsOf(described([{ name: 'PULSE_GITHUB_REPO', value: 'x' }]))).toEqual([
      'PULSE_GITHUB_REPO is set, though the API reads nothing of GitHub',
    ])
  })
})
