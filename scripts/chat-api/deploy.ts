import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  CHAT_API_ORIGIN,
  MAX_INSTANCES,
  MIN_INSTANCES,
  MODEL,
  PROJECT,
  REGION,
  SECRETS,
  SERVICE,
  SERVICE_ACCOUNT,
  TIMEOUT_SECONDS,
} from '../../apps/chat-api/src/constants.ts'
import { parseCorpus } from '../../apps/chat-api/src/corpus.ts'

// pnpm chat-api:deploy: deploys the chat API to Cloud Run by hand, never from
// CI (spec 021, S8.1, FR-010, D170, D185). From a clean checkout at a commit
// on origin/main, it takes live's /corpus.json, checks it, bundles the server
// beside it, deploys with Cloud Build from that folder, then reads the service
// back and fails on any cap that differs. Every command goes through
// deps.run, which tests replace with a fake.

export interface RunResult {
  status: number | null
  stdout: string
  stderr: string
}

export interface DeployDeps {
  root: string
  run(command: string, args: readonly string[]): RunResult
  fetchCorpus(): Promise<string>
  /** Bundles apps/chat-api/src/server.ts into outDir/server.mjs. */
  bundle?(outDir: string): Promise<void>
  writeFile(file: string, text: string): void
  print(line: string): void
}

const CORPUS_URL = 'https://bradthome.com/corpus.json'
const OUT = path.join('apps', 'chat-api', '.deploy')
const USAGE = 'Usage: pnpm chat-api:deploy'
/** The API's own package, for the one dependency the deploy folder installs. */
const PACKAGE = path.join(import.meta.dirname, '..', '..', 'apps', 'chat-api', 'package.json')
/** The one dependency esbuild leaves out: Firestore's client loads its protos from files. */
const EXTERNAL = '@google-cloud/firestore'

class Refusal extends Error {
  readonly headline: string
  readonly fix: string
  readonly detail: readonly string[]

  constructor(headline: string, fix: string, detail: readonly string[] = []) {
    super(headline)
    this.headline = headline
    this.fix = fix
    this.detail = detail
  }
}

/** A tool's line with email addresses hidden, since deploy output may be pasted into a record. */
export function hidden(line: string): string {
  return line.replaceAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, (match) => (match === SERVICE_ACCOUNT ? match : '[address]'))
}

function step(deps: DeployDeps, command: string, args: readonly string[], headline: string, fix: string): string {
  const result = deps.run(command, args)
  if (result.status !== 0) {
    const lines = `${result.stdout}\n${result.stderr}`
      .replaceAll(/\x1b\[[0-9;]*m/g, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
    const shown = lines.find((line) => /^(?:Error|ERROR)\b/.test(line)) ?? lines.at(-1)
    throw new Refusal(headline, fix, shown === undefined ? [] : [hidden(shown)])
  }
  return result.stdout
}

interface EnvVar {
  name?: string
  value?: string
  valueFrom?: { secretKeyRef?: { name?: string; key?: string } }
}

/** What differs from the caps in gcloud's describe of the service, or nothing (S8.1). */
export function problemsOf(described: unknown): string[] {
  const s = described as {
    metadata?: { labels?: Record<string, string> }
    spec?: {
      template?: {
        metadata?: { annotations?: Record<string, string> }
        spec?: { serviceAccountName?: string; timeoutSeconds?: number; containers?: { env?: EnvVar[] }[] }
      }
    }
  }
  const problems: string[] = []
  const annotations = s.spec?.template?.metadata?.annotations ?? {}
  const template = s.spec?.template?.spec
  const env = template?.containers?.[0]?.env ?? []
  const secret = (name: string) => env.find((e) => e.name === name)?.valueFrom?.secretKeyRef?.name
  if (s.metadata?.labels?.['cloud.googleapis.com/location'] !== REGION) problems.push(`the region isn't ${REGION}`)
  if ((annotations['autoscaling.knative.dev/minScale'] ?? '0') !== String(MIN_INSTANCES))
    problems.push(`minimum instances aren't ${MIN_INSTANCES}`)
  if (annotations['autoscaling.knative.dev/maxScale'] !== String(MAX_INSTANCES)) problems.push(`maximum instances aren't ${MAX_INSTANCES}`)
  if (template?.serviceAccountName !== SERVICE_ACCOUNT) problems.push(`the service account isn't ${SERVICE_ACCOUNT}`)
  if (template?.timeoutSeconds !== TIMEOUT_SECONDS) problems.push(`the timeout isn't ${TIMEOUT_SECONDS} s`)
  if (env.find((e) => e.name === 'CHAT_MODEL')?.value !== MODEL) problems.push(`the model isn't ${MODEL}`)
  // Anthropic's tokens come from workload identity federation (D187), and a
  // key set here would win over it in Anthropic's own SDKs.
  for (const name of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'])
    if (env.some((e) => e.name === name)) problems.push(`${name} is set, though the API signs in through federation`)
  if (secret('ALTCHA_KEY') !== SECRETS.altcha) problems.push(`ALTCHA_KEY isn't from the secret ${SECRETS.altcha}`)
  return problems
}

/** Runs the deploy and returns the exit code: 0 deployed, 1 refused or failed, 2 bad flags. */
export async function deploy(argv: readonly string[], deps: DeployDeps): Promise<number> {
  if (argv.length > 0) {
    deps.print(USAGE)
    return 2
  }
  try {
    const status = step(deps, 'git', ['status', '--porcelain'], "couldn't read the checkout's status", 'run it from the repo.')
    if (status.trim() !== '') throw new Refusal('the checkout has changes', 'commit or set them aside, then deploy again.')
    step(deps, 'git', ['fetch', 'origin', 'main'], "couldn't fetch origin/main", 'check the network, then deploy again.')
    step(
      deps,
      'git',
      ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'],
      "this commit isn't on origin/main",
      'deploy from main, after Brad says push.',
    )
    const commit = step(deps, 'git', ['rev-parse', 'HEAD'], "couldn't read the commit", 'run it from the repo.').trim()

    let corpus
    try {
      corpus = parseCorpus(JSON.parse(await deps.fetchCorpus()))
    } catch {
      throw new Refusal(
        `live's corpus at ${CORPUS_URL} didn't load or doesn't match the schema`,
        "check bradthome.com's /corpus.json, then deploy again.",
      )
    }
    const out = path.join(deps.root, OUT)
    await deps.bundle?.(out)
    deps.writeFile(path.join(out, 'corpus.json'), `${JSON.stringify(corpus, null, 2)}\n`)
    const pkg = JSON.parse(readFileSync(PACKAGE, 'utf8')) as { dependencies: Record<string, string> }
    deps.writeFile(
      path.join(out, 'package.json'),
      `${JSON.stringify(
        {
          name: 'chat-api-deploy',
          private: true,
          type: 'module',
          engines: { node: '22' },
          scripts: { start: 'node server.mjs' },
          dependencies: { [EXTERNAL]: pkg.dependencies[EXTERNAL] },
        },
        null,
        2,
      )}\n`,
    )

    step(
      deps,
      'gcloud',
      [
        'run',
        'deploy',
        SERVICE,
        `--source=${OUT.replaceAll('\\', '/')}`,
        `--region=${REGION}`,
        `--project=${PROJECT}`,
        `--service-account=${SERVICE_ACCOUNT}`,
        `--min-instances=${MIN_INSTANCES}`,
        `--max-instances=${MAX_INSTANCES}`,
        `--timeout=${TIMEOUT_SECONDS}`,
        '--cpu=1',
        '--memory=512Mi',
        '--concurrency=20',
        '--allow-unauthenticated',
        `--set-secrets=ALTCHA_KEY=${SECRETS.altcha}:latest`,
        `--set-env-vars=CHAT_MODEL=${MODEL},DEPLOYED_COMMIT=${commit}`,
        '--quiet',
      ],
      'the Cloud Run deploy failed',
      'read the error above, then deploy again.',
    )
    const described = step(
      deps,
      'gcloud',
      ['run', 'services', 'describe', SERVICE, `--region=${REGION}`, `--project=${PROJECT}`, '--format=json'],
      "couldn't read the service back",
      'gcloud auth login with an account that can read it.',
    )
    let parsed: unknown
    try {
      parsed = JSON.parse(described)
    } catch {
      throw new Refusal("the service's settings didn't parse", 'run gcloud run services describe by hand.')
    }
    const problems = problemsOf(parsed)
    if (problems.length > 0)
      throw new Refusal('the deployed service differs from its caps', 'set it back with this script, then check again.', problems)
    deps.print(`✓ chat-api:deploy  ${CHAT_API_ORIGIN} runs ${commit}, 0 to 2 instances, ${MODEL}`)
    return 0
  } catch (error) {
    if (!(error instanceof Refusal)) throw error
    deps.print(`✖ chat-api:deploy  ${error.headline}`)
    for (const line of error.detail) deps.print(`  ${line}`)
    deps.print(`  Fix: ${error.fix}`)
    return 1
  }
}

async function bundle(root: string, outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true })
  const pkg = path.join(root, 'apps', 'chat-api', 'package.json')
  const esbuild = (await import(pathToFileURL(createRequire(pkg).resolve('esbuild')).href)) as {
    build(options: Record<string, unknown>): Promise<unknown>
  }
  await esbuild.build({
    entryPoints: [path.join(root, 'apps', 'chat-api', 'src', 'server.ts')],
    outfile: path.join(outDir, 'server.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: [EXTERNAL],
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    logLevel: 'warning',
  })
}

async function main(): Promise<number> {
  const root = process.cwd()
  return deploy(process.argv.slice(2), {
    root,
    // gcloud is a .cmd file on Windows, which only a shell runs. The
    // arguments are this script's own, never the caller's.
    run: (command, args) => {
      const shell = process.platform === 'win32'
      const quoted = shell ? args.map((arg) => (/[\s"()=,]/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg)) : args
      const result = spawnSync(command, quoted, { cwd: root, encoding: 'utf8', shell, stdio: ['ignore', 'pipe', 'pipe'] })
      return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
    },
    fetchCorpus: async () => {
      const response = await fetch(CORPUS_URL)
      if (!response.ok) throw new Error(`${response.status}`)
      return response.text()
    },
    bundle: (outDir) => bundle(root, outDir),
    writeFile: (file, text) => {
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, text)
    },
    print: (line) => console.log(line),
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main()
