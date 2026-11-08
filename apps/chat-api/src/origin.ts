// Only previews and next may call the API (FR-001, D183). Every channel of the
// bradthome Hosting site is served at https://bradthome--<channel>.web.app.
// The live site, bradthome.com and its web.app and firebaseapp.com domains,
// never is.

const CHANNEL = /^https:\/\/bradthome--[a-z0-9-]+\.web\.app$/

export function isAllowedOrigin(origin: string | null | undefined): origin is string {
  return typeof origin === 'string' && CHANNEL.test(origin)
}
