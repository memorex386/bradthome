import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { CHAT_API_ORIGIN, PULSE_SECRETS } from '../../../apps/chat-api/src/constants.ts'
import { pulseSnapshotSchema } from '../../../apps/site/src/content/previews.ts'
import { deploy, problemsOf, PULSE_ENV, type RunResult } from '../../../scripts/chat-api/deploy.ts'
import { isRefreshPath } from '../../../scripts/previews/open-pr-lib.ts'
import { type Fetcher, pulseOf, pulseText } from '../../../scripts/previews/refresh-lib.ts'
import { CORPUS } from '../../021/helpers/fakes.ts'

// Spec 041, Stories 4 and 5: the deploy mounts the pulse's two secrets once
// they hold a value (S4.9), and the weekly refresh keeps the card's built
// numbers current (S5.1, S5.2). Every command and fetch is a fake.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')
const SHA = 'b'.repeat(40)
const ok = (stdout = ''): RunResult => ({ status: 0, stdout, stderr: '' })
const DESCRIBE = 'gcloud run services describe chat-api --region=us-central1 --project=bradthome --format=json'
const VERSIONS = (secret: string) =>
  `gcloud secrets versions list ${secret} --project=bradthome --filter=state:enabled --format=value(name) --limit=1`

type Env = { name: string; value?: string; valueFrom?: { secretKeyRef: { name: string; key: string } } }

function described(extra: Env[] = []): string {
  return JSON.stringify({
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
}

const mounted: Env[] = Object.entries(PULSE_ENV).map(([name, secret]) => ({
  name,
  valueFrom: { secretKeyRef: { name: secret, key: 'latest' } },
}))

async function deployWith(answers: Record<string, RunResult>) {
  const calls: string[] = []
  const printed: string[] = []
  const defaults: Record<string, RunResult> = {
    'git status --porcelain': ok(),
    'git fetch origin main': ok(),
    'git merge-base --is-ancestor HEAD origin/main': ok(),
    'git rev-parse HEAD': ok(`${SHA}\n`),
    [DESCRIBE]: ok(described()),
    [VERSIONS(PULSE_SECRETS.token)]: ok(),
    [VERSIONS(PULSE_SECRETS.repo)]: ok(),
  }
  const code = await deploy([], {
    root: path.resolve('/repo'),
    run: (command, args) => {
      const line = [command, ...args].join(' ')
      calls.push(line)
      const answer = answers[line] ?? defaults[line] ?? (line.startsWith('gcloud run deploy ') ? ok() : undefined)
      if (answer === undefined) throw new Error(`unexpected command: ${line}`)
      return answer
    },
    fetchCorpus: async () => JSON.stringify(CORPUS),
    writeFile: () => {},
    print: (line) => void printed.push(line),
    readRepo: (file) => {
      try {
        return read(file)
      } catch {
        return undefined
      }
    },
  })
  return { code, calls, printed, deployLine: calls.find((line) => line.startsWith('gcloud run deploy ')) ?? '' }
}

describe('the deploy and the secrets', () => {
  test('S4.9 FR-006 with no value in the secrets yet, the deploy mounts neither and says the count stays off', async () => {
    const result = await deployWith({})
    expect(result.code).toBe(0)
    expect(result.deployLine).toContain('--set-secrets=ALTCHA_KEY=chat-altcha-key:latest ')
    expect(result.deployLine).not.toMatch(/PULSE_GITHUB/)
    expect(result.printed.join('\n')).toMatch(/no value yet/)
  })

  test('S4.9 FR-006 once both secrets have a version, the deploy mounts them by name and checks them on the service read back', async () => {
    const answers = {
      [VERSIONS(PULSE_SECRETS.token)]: ok('1\n'),
      [VERSIONS(PULSE_SECRETS.repo)]: ok('1\n'),
      [DESCRIBE]: ok(described(mounted)),
    }
    const result = await deployWith(answers)
    expect(result.code).toBe(0)
    expect(result.deployLine).toContain(
      '--set-secrets=ALTCHA_KEY=chat-altcha-key:latest,PULSE_GITHUB_TOKEN=pulse-github-token:latest,PULSE_GITHUB_REPO=pulse-github-repo:latest',
    )
    const missing = await deployWith({ ...answers, [DESCRIBE]: ok(described()) })
    expect(missing.code).toBe(1)
    expect(missing.printed.join('\n')).toMatch(/PULSE_GITHUB_TOKEN isn't from the secret pulse-github-token/)
  })

  test('S4.9 one secret with a value and the other without mounts neither', async () => {
    const result = await deployWith({ [VERSIONS(PULSE_SECRETS.token)]: ok('1\n') })
    expect(result.deployLine).not.toMatch(/PULSE_GITHUB/)
  })

  test('S4.9 FR-006 a token or repo set as a plain value fails the read back', () => {
    const plain = JSON.parse(described([{ name: 'PULSE_GITHUB_TOKEN', value: 'x' }])) as unknown
    expect(problemsOf(plain)).toContain('PULSE_GITHUB_TOKEN is set as a plain value, not from its secret')
    expect(problemsOf(JSON.parse(described(mounted)) as unknown, true)).toEqual([])
  })

  test("S4.9 FR-006 the server reads the token and repo only from the environment, and the repo's name is in no committed file", () => {
    const server = read('apps', 'chat-api', 'src', 'server.ts')
    expect(server).toMatch(/process\.env\.PULSE_GITHUB_TOKEN/)
    expect(server).toMatch(/process\.env\.PULSE_GITHUB_REPO/)
    expect(PULSE_SECRETS).toEqual({ token: 'pulse-github-token', repo: 'pulse-github-repo' })
    for (const file of ['apps/chat-api/src/constants.ts', 'apps/chat-api/src/pulse.ts', 'scripts/chat-api/deploy.ts']) {
      expect(read(file), file).not.toMatch(/PULSE_GITHUB_REPO\s*=\s*['"][^'"]+\/[^'"]+['"]/)
      expect(read(file), file).not.toMatch(/github_pat_|ghp_/)
    }
  })
})

describe('the weekly refresh', () => {
  const LOOKUP_URL = 'https://itunes.apple.com/lookup?id=1191483515&country=us'
  const PULSE_URL = `${CHAT_API_ORIGIN}/pulse`
  const LOOKUP = {
    results: [{ version: '12.8.0', currentVersionReleaseDate: '2026-11-21T17:02:11Z', averageUserRating: 4.7, userRatingCount: 3254 }],
  }
  const OLD = {
    appStore: { fetched: '2026-11-17', version: '12.7.8', released: '2026-11-10' },
    github: { fetched: '2026-11-17', merged: 296 },
  }
  const URLS = { lookup: LOOKUP_URL, pulse: PULSE_URL }
  const fetcher = (answers: Record<string, unknown>): Fetcher & { calls: string[] } => {
    const calls: string[] = []
    return {
      calls,
      json: async (url) => {
        calls.push(url)
        if (!(url in answers)) throw new Error(`${new URL(url).hostname} answered 503`)
        return answers[url]
      },
      bytes: async () => new Uint8Array([1, 2, 3]),
    }
  }

  test("S5.1 S5.2 S3.8 the release comes from Apple's lookup and the count from the site's own API, never GitHub, each dated when it changed", async () => {
    const both = fetcher({ [LOOKUP_URL]: LOOKUP, [PULSE_URL]: { github: { merged: 301, days: 30, fetched: '2026-11-23T10:00:00Z' } } })
    const result = await pulseOf(OLD, both, URLS, '2026-11-23')
    expect(result.pulse).toEqual({
      appStore: { fetched: '2026-11-23', version: '12.8.0', released: '2026-11-21' },
      github: { fetched: '2026-11-23', merged: 301 },
    })
    expect(result.changed).toEqual(['pulse-appstore', 'pulse-github'])
    expect(both.calls).toEqual([LOOKUP_URL, PULSE_URL])
    for (const url of both.calls) expect(url).not.toMatch(/api\.github\.com/)
  })

  test('S5.1 S5.2 numbers that didn’t change keep their day', async () => {
    const same = fetcher({
      [LOOKUP_URL]: { results: [{ version: '12.7.8', currentVersionReleaseDate: '2026-11-10T17:02:11Z' }] },
      [PULSE_URL]: { github: { merged: 296, days: 30, fetched: '2026-11-23T10:00:00Z' } },
    })
    const result = await pulseOf(OLD, same, URLS, '2026-11-23')
    expect(result.pulse).toEqual(OLD)
    expect(result.changed).toEqual([])
  })

  test('S5.2 an API answer with no count keeps the last count and says so, without failing', async () => {
    const result = await pulseOf(OLD, fetcher({ [LOOKUP_URL]: LOOKUP, [PULSE_URL]: { appStore: {} } }), URLS, '2026-11-23')
    expect(result.pulse.github).toEqual(OLD.github)
    expect(result.failed).toEqual([])
    expect(result.notes.join(' ')).toMatch(/no merged count/)
  })

  test('S5.2 a source that fails keeps its last numbers and is reported, so the run fails', async () => {
    const result = await pulseOf(OLD, fetcher({ [LOOKUP_URL]: LOOKUP }), URLS, '2026-11-23')
    expect(result.pulse.github).toEqual(OLD.github)
    expect(result.pulse.appStore.version).toBe('12.8.0')
    expect(result.failed).toEqual([{ key: 'pulse-github', reason: expect.stringMatching(/503/) }])
    const script = read('scripts', 'previews', 'refresh.ts')
    expect(script).toMatch(/pulseFailed = pulse\.failed\.length > 0/)
    expect(script).toMatch(/result\.failed\.length > 0 \|\| pulseFailed \? 1 : 0/)
  })

  test("S5.2 the refresh asks the API as bradthome.com, and its pull request may carry the pulse's file", () => {
    const script = read('scripts', 'previews', 'refresh.ts')
    expect(script).toMatch(/base\.Origin = LIVE_ORIGIN/)
    expect(script).not.toMatch(/api\.github\.com\/repos/)
    expect(isRefreshPath('apps/site/content/previews/pulse.json')).toBe(true)
  })

  test("S3.8 S5.1 the committed pulse file is the refresh's own text, and the App Store snapshots don't carry it", () => {
    const text = read('apps', 'site', 'content', 'previews', 'pulse.json')
    const pulse = pulseSnapshotSchema.parse(JSON.parse(text))
    expect(pulseText(pulse)).toBe(text)
    expect(read('apps', 'site', 'content', 'previews', 'snapshots.json')).not.toMatch(/"version"|"released"/)
  })
})
