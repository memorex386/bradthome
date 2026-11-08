// The visitor's address, for the daily limit only (FR-005). Google's front end
// appends the address it saw to X-Forwarded-For, so the rightmost entry is the
// one a caller can't plant. Spec 021's probe confirms it on the deployed
// service.

export function addressOf(forwardedFor: string | null | undefined): string {
  const last = forwardedFor?.split(',').at(-1)?.trim()
  return last === undefined || last === '' ? 'unknown' : last
}
