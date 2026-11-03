import type { PullRequestEvent } from './modules.ts'
import { REPO_SLUG } from './paths.ts'

// GitHub's pull_request events, as the preview reads them: from a branch in
// the repo, from a fork, and from Dependabot. Only the fields the preview
// reads are filled in.

export const HEAD_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'

export function branchEvent(number = 12): PullRequestEvent {
  return {
    number,
    pull_request: {
      number,
      head: { sha: HEAD_SHA, ref: '003-skeleton-and-pipeline', repo: { full_name: REPO_SLUG, fork: false } },
      base: { repo: { full_name: REPO_SLUG } },
      user: { login: 'bradthome-agent' },
    },
    repository: { full_name: REPO_SLUG },
  }
}

export function forkEvent(number = 13): PullRequestEvent {
  const event = branchEvent(number)
  event.pull_request.head = { sha: HEAD_SHA, ref: 'patch-1', repo: { full_name: 'someone-else/bradthome', fork: true } }
  event.pull_request.user = { login: 'someone-else' }
  return event
}

/** A fork whose repo GitHub no longer shows, as when it was deleted. */
export function deletedForkEvent(number = 14): PullRequestEvent {
  const event = forkEvent(number)
  event.pull_request.head.repo = null
  return event
}

export function dependabotEvent(number = 15): PullRequestEvent {
  const event = branchEvent(number)
  event.pull_request.head = { sha: HEAD_SHA, ref: 'dependabot/npm_and_yarn/npm-1a2b3c', repo: { full_name: REPO_SLUG, fork: false } }
  event.pull_request.user = { login: 'dependabot[bot]' }
  return event
}

/** The variables GitHub sets in a job with id-token: write. Made-up values. */
export const TOKEN_ENV = {
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://pipelines.actions.githubusercontent.com/made-up/idtoken?api-version=2.0',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'made-up-request-token-for-tests-only',
} as const

/** The preview's repo variables. Made-up project number. */
export const PREVIEW_VARS = {
  GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/123456789012/locations/global/workloadIdentityPools/github/providers/bradthome-repo',
  GCP_PREVIEW_SERVICE_ACCOUNT: 'preview-deployer@bradthome.iam.gserviceaccount.com',
  FIREBASE_PROJECT_ID: 'bradthome',
} as const
