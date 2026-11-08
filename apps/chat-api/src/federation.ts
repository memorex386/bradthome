import { EXCHANGE_TIMEOUT_MS, FEDERATION, TOKEN_REFRESH_SECONDS } from './constants.ts'

// Anthropic's workload identity federation (spec 021, S8.4, FR-013, D187).
// The AI SDK calls the returned function before each model request. It asks
// Cloud Run's metadata server for a Google identity token for the service's
// own account, trades it at Anthropic for a short-lived token, and keeps that
// until 2 minutes before it expires. Questions that arrive together share
// one exchange. Each request has its own time limit, since the AI SDK waits
// for the token before its own abort signal applies. Neither token is ever
// logged or put in an error.

const AUDIENCE = 'https://api.anthropic.com'
const METADATA_URL = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(AUDIENCE)}&format=full`
const EXCHANGE_URL = 'https://api.anthropic.com/v1/oauth/token'

export interface FederationDeps {
  fetch?: (input: string, init?: RequestInit) => Promise<Response>
  /** Milliseconds since the epoch. */
  now?: () => number
  /** Each request's time limit. */
  timeoutMs?: number
}

export function federatedToken(deps: FederationDeps = {}): () => Promise<string> {
  const fetch = deps.fetch ?? globalThis.fetch
  const now = deps.now ?? Date.now
  const timeoutMs = deps.timeoutMs ?? EXCHANGE_TIMEOUT_MS
  let cached: { token: string; refreshAt: number } | undefined
  let pending: Promise<string> | undefined

  async function exchange(): Promise<string> {
    const identity = await fetch(METADATA_URL, { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(timeoutMs) })
    if (!identity.ok) throw new Error(`The metadata server answered ${identity.status}.`)
    const assertion = (await identity.text()).trim()
    const started = now()
    const response = await fetch(EXCHANGE_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
        federation_rule_id: FEDERATION.ruleId,
        organization_id: FEDERATION.organizationId,
        service_account_id: FEDERATION.serviceAccountId,
        workspace_id: FEDERATION.workspaceId,
      }),
    })
    if (!response.ok) throw new Error(`The Anthropic token exchange answered ${response.status}.`)
    const body = (await response.json()) as { access_token?: unknown; expires_in?: unknown }
    if (typeof body.access_token !== 'string' || body.access_token === '')
      throw new Error('The Anthropic token exchange returned no token.')
    const lifetime = typeof body.expires_in === 'number' ? body.expires_in : 0
    cached = { token: body.access_token, refreshAt: started + (lifetime - TOKEN_REFRESH_SECONDS) * 1000 }
    return body.access_token
  }

  return () => {
    if (cached !== undefined && now() < cached.refreshAt) return Promise.resolve(cached.token)
    pending ??= exchange().finally(() => {
      pending = undefined
    })
    return pending
  }
}
