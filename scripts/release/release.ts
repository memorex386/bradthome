import { envValue } from '../lib/terms.ts'
import { contextFor, type Context, flags, inActions, reason } from './context.ts'
import { HostingError, versionId, versionName } from './hosting.ts'
import { waitUntilServed } from './serve.ts'

// release.yml's release job (spec 008, S1.3, S1.4, FR-003, FR-004). After
// Brad approves in the production environment, it points the live channel at
// the version the stage job deployed to the release channel and checked, then
// proves bradthome.com serves its every file. If the site doesn't within 10
// minutes, it points the channel back at the version that was live before,
// proves that, and fails. It builds and uploads nothing.
//
// On a machine it runs only against a channel that isn't live, for the
// rehearsal: node scripts/release/release.ts --version <id> --channel <c>
// --staged-channel <s> [--as <account>].

export interface ReleaseDeps extends Context {
  stagedChannel: string
  version: string
  message?: string
}

const minutes = (ms: number): string => `${Math.round(ms / 60_000)} minutes`
const seconds = (ms: number): string => `${Math.round(ms / 1000)} s`

/** Points the channel at a version, then proves it's served. The result says whether it is. */
export async function releaseAndProve(
  deps: Context,
  version: string,
  message?: string,
): Promise<{ ok: boolean; files: number; elapsedMs: number; mismatches: string[] }> {
  const files = await deps.hosting.files(version)
  await deps.hosting.release(deps.site, deps.channel, version, message)
  const served = await waitUntilServed({
    base: deps.url,
    files,
    fetch: deps.fetch,
    sleep: deps.sleep,
    now: deps.now,
    timeoutMs: deps.timeoutMs,
    intervalMs: deps.intervalMs,
  })
  return { ok: served.ok, files: files.length, elapsedMs: served.elapsedMs, mismatches: served.mismatches }
}

export async function runRelease(deps: ReleaseDeps): Promise<number> {
  const fail = (headline: string, detail: readonly string[] = []): number => {
    deps.print([`✖ release  ${headline}`, ...detail.map((line) => `  ${line}`)].join('\n'))
    return 1
  }
  let version: string
  let previous: string | undefined
  try {
    version = versionName(deps.site, deps.version)
    const staged = await deps.hosting.channel(deps.site, deps.stagedChannel)
    if (staged.release?.version.name !== version) {
      return fail(`${versionId(version)} isn't what the ${deps.stagedChannel} channel holds now, so it wasn't the version checked.`, [
        'Fix: run the release workflow again. Nothing changed.',
      ])
    }
    if ((await deps.hosting.version(version))?.status !== 'FINALIZED')
      return fail(`${versionId(version)} isn't a finalized version of ${deps.site}.`)
    previous = (await deps.hosting.channel(deps.site, deps.channel)).release?.version.name
  } catch (error) {
    return fail(reason(error), ['Nothing changed.'])
  }

  const putBack = async (why: string): Promise<number> => {
    if (previous === undefined) {
      deps.print('✖ rollback  there was no earlier version on the channel to put back.')
      return 1
    }
    try {
      const back = await releaseAndProve(deps, previous, `Rolled back: ${why}`)
      deps.print(
        back.ok
          ? `✓ rollback  version ${versionId(previous)} is served again on ${deps.channel}, after ${seconds(back.elapsedMs)}`
          : `✖ rollback  version ${versionId(previous)} is released again, but not yet served everywhere. Run pnpm release:status, then the rollback workflow.`,
      )
    } catch (error) {
      deps.print(`✖ rollback  ${reason(error)}. Run the rollback workflow, or roll back in the Firebase console.`)
    }
    return 1
  }

  let files: Awaited<ReturnType<typeof deps.hosting.files>>
  try {
    files = await deps.hosting.files(version)
  } catch (error) {
    return fail(reason(error), ['Nothing changed.'])
  }
  try {
    await deps.hosting.release(deps.site, deps.channel, version, deps.message)
  } catch (error) {
    // Hosting answered with an error, so it made no release. Anything else,
    // such as a dropped connection, leaves the outcome unknown, so the
    // previous version goes back (S1.4).
    if (error instanceof HostingError) return fail(reason(error), ['Hosting refused it, so nothing changed.'])
    deps.print(`✖ release  ${reason(error)}: the release may or may not have happened.`)
    return putBack(`the release of ${versionId(version)} had no clear answer`)
  }
  const served = await waitUntilServed({
    base: deps.url,
    files,
    fetch: deps.fetch,
    sleep: deps.sleep,
    now: deps.now,
    timeoutMs: deps.timeoutMs,
    intervalMs: deps.intervalMs,
  })
  if (served.ok) {
    deps.print(
      `✓ release  version ${versionId(version)} is served on ${deps.channel} at ${deps.url}: ${files.length} files, after ${seconds(served.elapsedMs)}`,
    )
    return 0
  }

  deps.print(
    [
      `✖ release  version ${versionId(version)} was not served within ${minutes(deps.timeoutMs)} on ${deps.url}:`,
      ...served.mismatches.slice(0, 10).map((line) => `  ${line}`),
    ].join('\n'),
  )
  return putBack(`${versionId(version)} was not served`)
}

async function main(argv: readonly string[], env: NodeJS.ProcessEnv): Promise<number> {
  try {
    if (inActions(env)) {
      const deps = await contextFor({ env, accountVariable: 'GCP_RELEASE_SERVICE_ACCOUNT', channel: 'live' })
      const tag = envValue(env, 'GITHUB_REF_NAME') ?? ''
      const sha = (envValue(env, 'GITHUB_SHA') ?? '').slice(0, 7)
      return await runRelease({
        ...deps,
        stagedChannel: 'release',
        version: envValue(env, 'RELEASE_VERSION') ?? '',
        message: `${tag} (${sha})`,
      })
    }
    const values = flags(argv, { 'staged-channel': { type: 'string' } })
    const channel = typeof values.channel === 'string' ? values.channel : ''
    const staged = typeof values['staged-channel'] === 'string' ? values['staged-channel'] : ''
    if (channel === '' || channel === 'live' || staged === '' || typeof values.version !== 'string') {
      console.log(
        [
          "✖ release  on a machine, this releases only to a channel that isn't live, for the rehearsal.",
          '  Usage: node scripts/release/release.ts --version <id> --channel <channel> --staged-channel <channel> [--as <account>]',
          '  A live release runs in the release workflow, after Brad approves it.',
        ].join('\n'),
      )
      return 1
    }
    const deps = await contextFor({ env, accountVariable: '', channel, ...(typeof values.as === 'string' ? { actAs: values.as } : {}) })
    return await runRelease({ ...deps, stagedChannel: staged, version: values.version, message: 'rehearsal' })
  } catch (error) {
    console.log(`✖ release  ${reason(error)}`)
    return 1
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2), process.env)
