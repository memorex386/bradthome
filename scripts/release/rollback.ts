import { envValue } from '../lib/terms.ts'
import { contextFor, type Context, flags, inActions, reason } from './context.ts'
import { previousVersion, versionId, versionName } from './hosting.ts'
import { releaseAndProve } from './release.ts'

// The rollback (spec 008, S2.1, S2.2, FR-004, FR-005). It points a channel at
// the version that was live before the current one, or at the version it's
// given, the way the Firebase console's rollback does, then proves the site
// serves that version's every file.
//
// - rollback.yml runs it on the live channel, after Brad approves.
// - pnpm release:rollback [--version <id>] runs it from a machine with Brad's
//   gcloud login, if Actions is down. --channel <c> rolls back another channel,
//   as the rehearsal does, and --as <account> acts as a service account.

export interface RollbackDeps extends Context {
  version?: string
}

export async function runRollback(deps: RollbackDeps): Promise<number> {
  const fail = (headline: string, detail: readonly string[] = []): number => {
    deps.print([`✖ rollback  ${headline}`, ...detail.map((line) => `  ${line}`)].join('\n'))
    return 1
  }
  let target: string
  try {
    if (deps.version !== undefined && deps.version !== '') {
      let named: string
      try {
        named = versionName(deps.site, deps.version)
      } catch {
        return fail(`${deps.version} isn't a finalized version of ${deps.site}.`, ['Nothing changed.'])
      }
      if ((await deps.hosting.version(named))?.status !== 'FINALIZED') {
        return fail(`${versionId(named)} isn't a finalized version of ${deps.site}.`, [
          'Fix: pick one from pnpm release:status. Nothing changed.',
        ])
      }
      target = named
    } else {
      const found = previousVersion(await deps.hosting.releases(deps.site, deps.channel))
      if (found === undefined) return fail(`${deps.channel} has no earlier version to go back to.`, ['Nothing changed.'])
      target = found
    }
  } catch (error) {
    return fail(reason(error), ['Nothing changed.'])
  }

  try {
    const result = await releaseAndProve(deps, target, `Rollback to ${versionId(target)}`)
    if (result.ok) {
      deps.print(
        `✓ rollback  version ${versionId(target)} is served on ${deps.channel} at ${deps.url}: ${result.files} files, rollback served after ${Math.round(result.elapsedMs / 1000)} s`,
      )
      return 0
    }
    return fail(
      `version ${versionId(target)} is released on ${deps.channel}, but not served within ${Math.round(deps.timeoutMs / 60_000)} minutes:`,
      result.mismatches.slice(0, 10),
    )
  } catch (error) {
    return fail(reason(error), ['Check what the channel serves with pnpm release:status.'])
  }
}

async function main(argv: readonly string[], env: NodeJS.ProcessEnv): Promise<number> {
  try {
    if (inActions(env)) {
      const deps = await contextFor({ env, accountVariable: 'GCP_RELEASE_SERVICE_ACCOUNT', channel: 'live' })
      return await runRollback({ ...deps, version: envValue(env, 'ROLLBACK_VERSION') ?? '' })
    }
    const values = flags(argv)
    const deps = await contextFor({
      env,
      accountVariable: '',
      channel: typeof values.channel === 'string' ? values.channel : 'live',
      ...(typeof values.as === 'string' ? { actAs: values.as } : {}),
      ...(typeof values.url === 'string' ? { url: values.url } : {}),
    })
    return await runRollback({ ...deps, ...(typeof values.version === 'string' ? { version: values.version } : {}) })
  } catch (error) {
    console.log(`✖ rollback  ${reason(error)}`)
    return 1
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2), process.env)
