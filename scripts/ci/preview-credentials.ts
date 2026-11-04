import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { envValue } from '../lib/terms.ts'
import { type PullRequestEvent, previewSkip } from './preview-deploy.ts'

// Google's federated sign-in file for the preview's deploy job (FR-016, S3.2).
// Google's token service swaps GitHub's identity token for a federated one,
// which impersonates the preview service account. It's the external_account
// file google-github-actions/auth writes, without running its code, and it
// holds no key: only where to fetch GitHub's token and what to swap it for.
// The command line writes it to $RUNNER_TEMP and names it in $GITHUB_ENV as
// GOOGLE_APPLICATION_CREDENTIALS. When the preview skips, it writes nothing,
// and the deploy step says why.

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = envValue(env, name)
  if (!value) throw new Error(`${name} is not set`)
  return value
}

/** The external_account file's content. It throws when a setting or the token is missing. */
export function credentialsFor(env: NodeJS.ProcessEnv): Record<string, unknown> {
  const provider = required(env, 'GCP_WORKLOAD_IDENTITY_PROVIDER')
  const account = required(env, 'GCP_PREVIEW_SERVICE_ACCOUNT')
  const tokenUrl = new URL(required(env, 'ACTIONS_ID_TOKEN_REQUEST_URL'))
  const requestToken = required(env, 'ACTIONS_ID_TOKEN_REQUEST_TOKEN')
  tokenUrl.searchParams.set('audience', `https://iam.googleapis.com/${provider}`)
  return {
    type: 'external_account',
    audience: `//iam.googleapis.com/${provider}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${account}:generateAccessToken`,
    credential_source: {
      url: tokenUrl.href,
      headers: { Authorization: `Bearer ${requestToken}` },
      format: { type: 'json', subject_token_field_name: 'value' },
    },
  }
}

function main(env: NodeJS.ProcessEnv): number {
  const eventPath = envValue(env, 'GITHUB_EVENT_PATH')
  if (eventPath) {
    // Only a pull request can skip for a fork (V2). Another event, such as a
    // push to main when CI runs this script's tests, has no pull_request.
    const event = JSON.parse(readFileSync(eventPath, 'utf8')) as Partial<PullRequestEvent>
    if (event.pull_request !== undefined && previewSkip(event as PullRequestEvent, env) !== undefined) return 0
  }
  let credentials: Record<string, unknown>
  try {
    credentials = credentialsFor(env)
  } catch (error) {
    console.log(
      [
        `✖ preview  ${error instanceof Error ? error.message : 'a sign-in setting is missing'}`,
        "  Fix: check the repo's GCP_ variables.",
      ].join('\n'),
    )
    return 1
  }
  const file = path.join(required(env, 'RUNNER_TEMP'), 'google-sign-in.json')
  writeFileSync(file, `${JSON.stringify(credentials)}\n`, { mode: 0o600 })
  appendFileSync(required(env, 'GITHUB_ENV'), `GOOGLE_APPLICATION_CREDENTIALS=${file}\n`)
  console.log('✓ preview  wrote the federated sign-in file')
  return 0
}

if (import.meta.main) process.exitCode = main(process.env)
