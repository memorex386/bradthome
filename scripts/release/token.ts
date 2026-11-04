import { spawnSync } from 'node:child_process'
import { envValue } from '../lib/terms.ts'
import type { Fetch } from './hosting.ts'

// A Google access token for the release scripts (spec 008, FR-007).
//
// - In Actions: GitHub's identity token is swapped through Workload Identity
//   Federation for a federated token, which then asks for the service
//   account's own token. It's the same exchange as the preview's sign-in file
//   (scripts/ci/preview-credentials.ts), done in this process, so the token is
//   never written to a file and nothing but Node runs while it's held.
// - On a machine: gcloud's token for the person signed in, or for a service
//   account they may act as.
//
// No error message carries a token.

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

async function json(fetchImpl: Fetch, step: string, url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetchImpl(url, init)
  if (!response.ok) throw new Error(`${step} answered HTTP ${response.status}`)
  return (await response.json()) as Record<string, unknown>
}

/** The service account's token, from GitHub's identity token. */
export async function actionsGoogleToken(env: NodeJS.ProcessEnv, account: string, fetchImpl: Fetch = fetch): Promise<string> {
  const requestUrl = envValue(env, 'ACTIONS_ID_TOKEN_REQUEST_URL')
  const requestToken = envValue(env, 'ACTIONS_ID_TOKEN_REQUEST_TOKEN')
  if (!requestUrl || !requestToken) throw new Error('GitHub gave this run no identity token: the job needs id-token: write')
  const provider = envValue(env, 'GCP_WORKLOAD_IDENTITY_PROVIDER')
  if (!provider) throw new Error('GCP_WORKLOAD_IDENTITY_PROVIDER is not set')
  if (!/^[\w.-]+@[\w.-]+\.iam\.gserviceaccount\.com$/.test(account)) throw new Error(`${account} isn't a service account`)

  const url = new URL(requestUrl)
  url.searchParams.set('audience', `https://iam.googleapis.com/${provider}`)
  const github = await json(fetchImpl, "GitHub's identity token", url.href, { headers: { authorization: `Bearer ${requestToken}` } })
  const federated = await json(fetchImpl, "Google's token exchange", 'https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: `//iam.googleapis.com/${provider}`,
      scope: SCOPE,
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      subjectToken: String(github.value ?? ''),
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
    }),
  })
  const step = `${account}:generateAccessToken`
  const access = await json(
    fetchImpl,
    step,
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${account}:generateAccessToken`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${String(federated.access_token ?? '')}` },
      body: JSON.stringify({ scope: [SCOPE] }),
    },
  )
  const token = access.accessToken
  if (typeof token !== 'string' || token === '') throw new Error(`${step} gave no token`)
  return token
}

/** gcloud's token on this machine, as the person signed in or as an account they may act as. */
export function gcloudToken(impersonate?: string): string {
  const args = ['auth', 'print-access-token', ...(impersonate === undefined ? [] : [`--impersonate-service-account=${impersonate}`])]
  const result = spawnSync('gcloud', args, { encoding: 'utf8', shell: process.platform === 'win32' })
  const token = (result.stdout ?? '').trim().split(/\r?\n/).at(-1) ?? ''
  if (result.status !== 0 || token === '') {
    const reason = (result.stderr ?? '').split(/\r?\n/).find((line) => /ERROR/.test(line)) ?? `gcloud exited with ${String(result.status)}`
    throw new Error(`no Google token from gcloud: ${reason.trim()}`)
  }
  return token
}
