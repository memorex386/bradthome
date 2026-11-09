// Who may call the API (FR-001): previews and next (D183), and from v2.1 the
// live site at https://bradthome.com (spec 023, D198). Every channel of the
// bradthome Hosting site is served at https://bradthome--<channel>.web.app.
// The live site's other names, www and its web.app and firebaseapp.com
// domains, never are.

const CHANNEL = /^https:\/\/bradthome--[a-z0-9-]+\.web\.app$/
export const LIVE_ORIGIN = 'https://bradthome.com'

export function isAllowedOrigin(origin: string | null | undefined): origin is string {
  return typeof origin === 'string' && (origin === LIVE_ORIGIN || CHANNEL.test(origin))
}
