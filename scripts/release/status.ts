import { contextFor, flags, reason } from './context.ts'
import { previousVersion, versionId } from './hosting.ts'

// pnpm release:status [--channel <c>]: which version a channel serves, what a
// rollback would put back, and the last releases (spec 008, FR-009). It only
// reads, with Brad's gcloud login.

async function main(argv: readonly string[], env: NodeJS.ProcessEnv): Promise<number> {
  try {
    const values = flags(argv, { count: { type: 'string' } })
    const channel = typeof values.channel === 'string' ? values.channel : 'live'
    const deps = await contextFor({ env, accountVariable: '', channel, ...(typeof values.as === 'string' ? { actAs: values.as } : {}) })
    const releases = await deps.hosting.releases(deps.site, channel)
    const current = releases[0]
    if (current === undefined) {
      console.log(`– status  ${channel} has no release yet`)
      return 0
    }
    const previous = previousVersion(releases)
    const lines = [
      `✓ status  ${channel} (${deps.url}) serves version ${versionId(current.version.name)}, released ${current.releaseTime}${current.message === undefined ? '' : `: ${current.message}`}`,
      `  A rollback would put back ${previous === undefined ? 'nothing: there is no earlier version' : `version ${versionId(previous)}`}.`,
      '  Recent releases, newest first:',
      ...releases
        .slice(0, Number(values.count ?? 10))
        .map(
          (release) =>
            `  ${release.releaseTime}  ${versionId(release.version.name)}  ${release.version.status}${release.message === undefined ? '' : `  ${release.message}`}`,
        ),
    ]
    console.log(lines.join('\n'))
    return 0
  } catch (error) {
    console.log(`✖ status  ${reason(error)}`)
    return 1
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2), process.env)
