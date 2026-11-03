import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { describeRun, runNode } from '../../001/helpers/run.ts'
import { createSandbox, type Sandbox, setEnv } from '../../001/helpers/sandbox.ts'
import { PREVIEW_VARS, TOKEN_ENV } from '../helpers/events.ts'
import { loadPreviewCredentials } from '../helpers/modules.ts'
import { SCRIPTS } from '../helpers/paths.ts'

// Google's federated sign-in file (FR-016, S3.2). The deploy job's script
// writes an external_account file: Google's token service swaps GitHub's
// identity token for a federated one, which impersonates the preview service
// account. It's the file google-github-actions/auth writes, without its code
// (plan). No Google key exists anywhere.

const sandboxes: Sandbox[] = []
afterEach(() => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
})

const env = (): NodeJS.ProcessEnv => ({ ...PREVIEW_VARS, ...TOKEN_ENV })

describe('the sign-in file', () => {
  test("S3.2 FR-016 swaps GitHub's identity token at Google's token service, for the repo's provider", async () => {
    const { credentialsFor } = await loadPreviewCredentials()
    const file = credentialsFor(env())
    expect(file.type).toBe('external_account')
    expect(file.audience).toBe(`//iam.googleapis.com/${PREVIEW_VARS.GCP_WORKLOAD_IDENTITY_PROVIDER}`)
    expect(file.subject_token_type).toBe('urn:ietf:params:oauth:token-type:jwt')
    expect(file.token_url).toBe('https://sts.googleapis.com/v1/token')
  })

  test('S3.2 FR-016 acts as the preview service account, by impersonation', async () => {
    const { credentialsFor } = await loadPreviewCredentials()
    expect(credentialsFor(env()).service_account_impersonation_url).toBe(
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${PREVIEW_VARS.GCP_PREVIEW_SERVICE_ACCOUNT}:generateAccessToken`,
    )
  })

  test("S3.2 FR-016 reads GitHub's token from the job's token URL, for the provider's audience", async () => {
    const { credentialsFor } = await loadPreviewCredentials()
    const source = credentialsFor(env()).credential_source as {
      url?: string
      headers?: Record<string, string>
      format?: { type?: string; subject_token_field_name?: string }
    }
    const url = new URL(source.url ?? '')
    expect(`${url.origin}${url.pathname}`).toBe(new URL(TOKEN_ENV.ACTIONS_ID_TOKEN_REQUEST_URL).origin + new URL(TOKEN_ENV.ACTIONS_ID_TOKEN_REQUEST_URL).pathname)
    expect(url.searchParams.get('api-version')).toBe('2.0')
    expect(url.searchParams.get('audience')).toBe(`https://iam.googleapis.com/${PREVIEW_VARS.GCP_WORKLOAD_IDENTITY_PROVIDER}`)
    expect(source.headers).toEqual({ Authorization: `Bearer ${TOKEN_ENV.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` })
    expect(source.format).toEqual({ type: 'json', subject_token_field_name: 'value' })
  })

  test('S3.2 FR-016 holds no key, and refuses to write a file when a setting or the token is missing', async () => {
    const { credentialsFor } = await loadPreviewCredentials()
    expect(JSON.stringify(credentialsFor(env()))).not.toMatch(/private_key|client_secret|refresh_token/)
    for (const name of [...Object.keys(TOKEN_ENV), 'GCP_WORKLOAD_IDENTITY_PROVIDER', 'GCP_PREVIEW_SERVICE_ACCOUNT']) {
      const partial = env()
      delete partial[name]
      expect(() => credentialsFor(partial), name).toThrow()
    }
  })
})

describe('its command line', () => {
  test("S3.2 FR-016 writes the file to the runner's temporary folder, names it in GITHUB_ENV, and prints neither it nor the token", () => {
    const sandbox = createSandbox({ terms: false })
    sandboxes.push(sandbox)
    const workspace = sandbox.path('workspace')
    const temp = sandbox.path('runner-temp')
    mkdirSync(workspace)
    mkdirSync(temp)
    const githubEnv = sandbox.path('github-env')
    writeFileSync(githubEnv, '')
    const runEnv = { ...sandbox.env }
    for (const [name, value] of Object.entries(env())) setEnv(runEnv, name, value)
    setEnv(runEnv, 'RUNNER_TEMP', temp)
    setEnv(runEnv, 'GITHUB_WORKSPACE', workspace)
    setEnv(runEnv, 'GITHUB_ENV', githubEnv)
    const result = runNode(SCRIPTS.previewCredentials, [], { cwd: workspace, env: runEnv })
    expect(result.status, describeRun(result)).toBe(0)
    expect(readdirSync(workspace)).toEqual([])
    const line = readFileSync(githubEnv, 'utf8')
      .split(/\r?\n/)
      .find((entry) => entry.startsWith('GOOGLE_APPLICATION_CREDENTIALS='))
    const file = line?.slice('GOOGLE_APPLICATION_CREDENTIALS='.length) ?? ''
    expect(path.resolve(path.dirname(file))).toBe(path.resolve(temp))
    expect((JSON.parse(readFileSync(file, 'utf8')) as { type?: string }).type).toBe('external_account')
    expect(`${result.stdout}${result.stderr}`).not.toContain(TOKEN_ENV.ACTIONS_ID_TOKEN_REQUEST_TOKEN)
  })
})
