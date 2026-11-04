import { describe, expect, test } from 'vitest'
import { tagProblem } from '../../../scripts/release/tag-check.ts'
import { actionsGoogleToken } from '../../../scripts/release/token.ts'

// What the release may run on, and how a job signs in to Google (spec 008,
// issue #29: S1.2, FR-001, FR-007).

describe('the release tag', () => {
  test('S1.2 FR-001 accepts a vX.Y.Z tag whose commit is on main', () => {
    expect(tagProblem({ refType: 'tag', refName: 'v1.0.0', onMain: true })).toBeUndefined()
    expect(tagProblem({ refType: 'tag', refName: 'v12.3.45', onMain: true })).toBeUndefined()
  })

  test('S1.2 FR-001 refuses a branch, a tag that is not semver, and a tag that is not on main, and says why', () => {
    expect(tagProblem({ refType: 'branch', refName: 'main', onMain: true })).toMatch(/runs only on a release tag/)
    for (const name of ['v1.0', '1.0.0', 'v1.0.0-rc.1', 'v1.0.0;x', 'release']) {
      expect(tagProblem({ refType: 'tag', refName: name, onMain: true }), name).toMatch(/isn't a vX\.Y\.Z tag/)
    }
    expect(tagProblem({ refType: 'tag', refName: 'v1.0.0', onMain: false })).toMatch(/isn't on main/)
  })
})

describe("GitHub's token for Google's", () => {
  test('FR-007 swaps the identity token through Workload Identity Federation for the named account, with no key', async () => {
    const calls: { url: string; body: string; auth: string | null }[] = []
    const fake = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = String(input)
      calls.push({ url, body: String(init?.body ?? ''), auth: new Headers(init?.headers).get('authorization') })
      if (new URL(url).host === 'token.actions.example') return Response.json({ value: 'github-jwt' })
      if (url === 'https://sts.googleapis.com/v1/token') return Response.json({ access_token: 'federated' })
      if (url.includes(':generateAccessToken')) return Response.json({ accessToken: 'google-access', expireTime: 'x' })
      return new Response('', { status: 404 })
    }
    const token = await actionsGoogleToken(
      {
        ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.example/?x=1',
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-token',
        GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/1/locations/global/workloadIdentityPools/github/providers/repo',
      },
      'release-deployer@bradthome.iam.gserviceaccount.com',
      fake,
    )
    expect(token).toBe('google-access')
    expect(calls[0]?.url).toContain(
      'audience=https%3A%2F%2Fiam.googleapis.com%2Fprojects%2F1%2Flocations%2Fglobal%2FworkloadIdentityPools%2Fgithub%2Fproviders%2Frepo',
    )
    expect(calls[0]?.auth).toBe('Bearer request-token')
    expect(calls[1]?.body).toContain('github-jwt')
    expect(calls[1]?.body).toContain('//iam.googleapis.com/projects/1/locations/global/workloadIdentityPools/github/providers/repo')
    expect(calls[2]?.url).toBe(
      'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/release-deployer@bradthome.iam.gserviceaccount.com:generateAccessToken',
    )
    expect(calls[2]?.auth).toBe('Bearer federated')
  })

  test('FR-007 fails with the step that refused, and never puts a token in the error', async () => {
    const fake = async (input: string | URL | Request): Promise<Response> => {
      const url = String(input)
      if (new URL(url).host === 'token.actions.example') return Response.json({ value: 'github-jwt' })
      if (url === 'https://sts.googleapis.com/v1/token') return Response.json({ access_token: 'federated' })
      return new Response('{"error":"denied"}', { status: 403 })
    }
    const env = {
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.example/',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-token',
      GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/1/locations/global/workloadIdentityPools/github/providers/repo',
    }
    const error = await actionsGoogleToken(env, 'release-deployer@bradthome.iam.gserviceaccount.com', fake).catch(
      (caught: unknown) => caught,
    )
    expect(String(error)).toMatch(/HTTP 403 .*generateAccessToken|generateAccessToken.*HTTP 403/)
    expect(String(error)).not.toMatch(/github-jwt|federated|request-token/)
    await expect(actionsGoogleToken({}, 'x@y', fake)).rejects.toThrow(/no identity token/)
  })
})
