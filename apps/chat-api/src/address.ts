// The visitor's address, for the daily limit only (FR-005). Google's front end
// appends the address it saw to X-Forwarded-For, so the rightmost entry is the
// one a caller can't plant. Without the header, it's the connection's own
// address. Spec 021's probe confirms the header on the deployed service.

export function addressOf(forwardedFor: string | null | undefined, connection?: string): string {
  const last = forwardedFor?.split(',').at(-1)?.trim()
  if (last !== undefined && last !== '') return last
  return connection !== undefined && connection !== '' ? connection : 'unknown'
}
