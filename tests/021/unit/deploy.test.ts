import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import * as constants from '../../../apps/chat-api/src/constants.ts'
import { deploy, problemsOf, type RunResult } from '../../../scripts/chat-api/deploy.ts'
import { CORPUS } from '../helpers/fakes.ts'

// Spec 021, Story 8: running on Cloud Run (FR-010, D170, D185). Every command
// goes through a fake runner, so nothing reaches git's remote or gcloud.

const ROOT = path.resolve('/repo')
/** The real checkout, whose eval record the deploy checks first (spec 037). */
const REPO = path.resolve(import.meta.dirname, '..', '..', '..')
const SHA = 'a'.repeat(40)
const ok = (stdout = ''): RunResult => ({ status: 0, stdout, stderr: '' })
const fail = (stderr = ''): RunResult => ({ status: 1, stdout: '', stderr })

/** gcloud's describe of a service with the caps the spec sets, changed by `change`. */
function described(change: (service: Service) => void = () => {}): string {
  const service: Service = {
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
                { name: 'DEPLOYED_COMMIT', value: SHA },
                { name: 'ALTCHA_KEY', valueFrom: { secretKeyRef: { name: 'chat-altcha-key', key: 'latest' } } },
              ],
            },
          ],
        },
      },
    },
    status: { url: 'https://chat-api-568431230204.us-central1.run.app' },
  }
  change(service)
  return JSON.stringify(service)
}

interface Service {
  metadata: { name: string; labels: Record<string, string> }
  spec: {
    template: {
      metadata: { annotations: Record<string, string> }
      spec: {
        serviceAccountName: string
        timeoutSeconds: number
        containers: { env: { name: string; value?: string; valueFrom?: { secretKeyRef: { name: string; key: string } } }[] }[]
      }
    }
  }
  status: { url: string }
}

const DESCRIBE = 'gcloud run services describe chat-api --region=us-central1 --project=bradthome --format=json'

async function run(argv: string[], answers: Record<string, RunResult> = {}, corpus: unknown = CORPUS) {
  const calls: string[] = []
  const files = new Map<string, string>()
  const printed: string[] = []
  const defaults: Record<string, RunResult> = {
    'git status --porcelain': ok(),
    'git fetch origin main': ok(),
    'git merge-base --is-ancestor HEAD origin/main': ok(),
    'git rev-parse HEAD': ok(`${SHA}\n`),
    [DESCRIBE]: ok(described()),
  }
  const code = await deploy(argv, {
    root: ROOT,
    run: (command, args) => {
      const line = [command, ...args].join(' ')
      calls.push(line)
      const answer =
        answers[line] ?? defaults[line] ?? (line.startsWith('pnpm ') || line.startsWith('gcloud run deploy ') ? ok() : undefined)
      if (answer === undefined) throw new Error(`unexpected command: ${line}`)
      return answer
    },
    fetchCorpus: async () => JSON.stringify(corpus),
    writeFile: (file, text) => void files.set(file, text),
    print: (line) => void printed.push(line),
    // Amended by spec 037 (D228): the deploy first checks the last full eval run, read here from the repo itself.
    readRepo: (file) => {
      try {
        return readFileSync(path.join(REPO, file), 'utf8')
      } catch {
        return undefined
      }
    },
  })
  return { calls, files, printed, code }
}

const deployCall = (calls: string[]) => calls.find((line) => line.startsWith('gcloud run deploy '))

describe('the deploy', () => {
  test('S8.1 FR-010 FR-013 deploys chat-api in us-central1 with 0 to 2 instances, its own account, the ALTCHA secret and no Anthropic key, a 120 s timeout and public access', async () => {
    const result = await run([])
    expect(result.code).toBe(0)
    const line = deployCall(result.calls) ?? ''
    for (const flag of [
      'gcloud run deploy chat-api',
      '--region=us-central1',
      '--project=bradthome',
      '--min-instances=0',
      '--max-instances=2',
      '--service-account=chat-api@bradthome.iam.gserviceaccount.com',
      '--timeout=120',
      '--allow-unauthenticated',
      '--set-secrets=ALTCHA_KEY=chat-altcha-key:latest',
      `--set-env-vars=CHAT_MODEL=claude-haiku-5-5,DEPLOYED_COMMIT=${SHA}`,
    ])
      expect(line).toContain(flag)
    expect(line).not.toMatch(/ANTHROPIC|chat-anthropic-key/)
    expect(result.calls.at(-1)).toBe(DESCRIBE)
    expect(result.printed.join('\n')).toContain(SHA)
  })

  test('S8.1 the bundle holds the live corpus, checked against the schema, beside the server', async () => {
    const result = await run([])
    const corpus = [...result.files.entries()].find(([file]) => file.endsWith('corpus.json'))
    expect(corpus?.[0]).toBe(path.join(ROOT, 'apps', 'chat-api', '.deploy', 'corpus.json'))
    expect(JSON.parse(corpus?.[1] ?? '{}')).toEqual(CORPUS)
    const bad = await run([], {}, { ...CORPUS, version: 2 })
    expect(bad.code).toBe(1)
    expect(deployCall(bad.calls)).toBeUndefined()
  })

  test('S8.1 FR-010 refuses a checkout with changes or a commit not on origin/main, before deploying', async () => {
    const dirty = await run([], { 'git status --porcelain': ok(' M apps/chat-api/src/app.ts\n') })
    expect(dirty.code).toBe(1)
    expect(dirty.calls).toEqual(['git status --porcelain'])
    expect(dirty.printed.at(-1)).toMatch(/^ {2}Fix: /)
    const off = await run([], { 'git merge-base --is-ancestor HEAD origin/main': fail() })
    expect(off.code).toBe(1)
    expect(deployCall(off.calls)).toBeUndefined()
  })

  test('S8.1 FR-010 FR-013 fails when the service read back differs from any cap, or holds an Anthropic key', async () => {
    const changes: ((s: Service) => void)[] = [
      (s) => (s.spec.template.metadata.annotations['autoscaling.knative.dev/minScale'] = '1'),
      (s) => (s.spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'] = '3'),
      (s) => delete s.spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'],
      (s) => (s.spec.template.spec.serviceAccountName = '568431230204-compute@developer.gserviceaccount.com'),
      (s) => (s.spec.template.spec.timeoutSeconds = 300),
      (s) => (s.metadata.labels['cloud.googleapis.com/location'] = 'us-east1'),
      (s) => (s.spec.template.spec.containers[0]!.env = s.spec.template.spec.containers[0]!.env.filter((e) => e.name !== 'ALTCHA_KEY')),
      (s) =>
        s.spec.template.spec.containers[0]!.env.push({
          name: 'ANTHROPIC_API_KEY',
          valueFrom: { secretKeyRef: { name: 'chat-anthropic-key', key: 'latest' } },
        }),
      (s) => s.spec.template.spec.containers[0]!.env.push({ name: 'ANTHROPIC_API_KEY', value: 'plain-text' }),
      (s) => s.spec.template.spec.containers[0]!.env.push({ name: 'ANTHROPIC_AUTH_TOKEN', value: 'plain-text' }),
      (s) => (s.spec.template.spec.containers[0]!.env[0] = { name: 'CHAT_MODEL', value: 'claude-sonnet-5-5' }),
    ]
    expect(problemsOf(JSON.parse(described()) as unknown)).toEqual([])
    for (const change of changes) {
      expect(problemsOf(JSON.parse(described(change)) as unknown).length).toBeGreaterThan(0)
      const result = await run([], { [DESCRIBE]: ok(described(change)) })
      expect(result.code).toBe(1)
    }
  })

  test('S8.1 a failed gcloud deploy is reported with its error line, and addresses hidden', async () => {
    const result = await run([], {}, CORPUS)
    expect(result.code).toBe(0)
    const failed = await run([], {
      [deployCall(result.calls) ?? '']: fail('ERROR: (gcloud.run.deploy) PERMISSION_DENIED for brad@example.com'),
    })
    expect(failed.code).toBe(1)
    expect(failed.printed.join('\n')).toContain('PERMISSION_DENIED')
    expect(failed.printed.join('\n')).not.toContain('brad@example.com')
  })

  test('S8.1 FR-010 no workflow deploys the API, so it reaches Cloud Run only from this script', () => {
    for (const file of readdirSync('.github/workflows'))
      expect(readFileSync(path.join('.github/workflows', file), 'utf8'), file).not.toMatch(/chat-api/)
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }
    expect(pkg.scripts['chat-api:deploy']).toBe('node scripts/chat-api/deploy.ts')
  })
})

describe('the settings', () => {
  test('S8.3 the model is one setting and the limits are named constants', () => {
    expect(constants).toMatchObject({
      MODEL: 'claude-haiku-5-5',
      DAY_LIMIT_USD: 2.5,
      MONTH_LIMIT_USD: 20,
      QUESTIONS_PER_DAY: 20,
      MAX_OUTPUT_TOKENS: 800,
      MIN_INSTANCES: 0,
      MAX_INSTANCES: 2,
      REGION: 'us-central1',
      SERVICE: 'chat-api',
    })
  })
})
