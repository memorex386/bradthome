import { spawnSync } from 'node:child_process'
import { appendFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { envValue } from '../lib/terms.ts'
import { credentialsFor } from '../ci/preview-credentials.ts'
import { preReleaseCheck, livePathsOf } from './check.ts'
import { LIVE_URL, reason } from './context.ts'
import { Hosting, versionId } from './hosting.ts'
import { actionsGoogleToken } from './token.ts'

// release.yml's stage job (spec 008, S1.1, S3.5, FR-006). As the preview
// account, which already deploys channels (D91), it puts the tagged build on
// the channel `release` with the live firebase.json, so the version checked is
// the version released, headers and all. Then it runs the pre-release check
// against bradthome.com, and hands the version to the release job only when
// the check passes. The channel expires 7 days after the run.

export const STAGE_CHANNEL = 'release'

export function stageArgs(project: string): string[] {
  if (!/^[a-z0-9-]+$/.test(project)) throw new Error(`${project} isn't a project ID`)
  return ['hosting:channel:deploy', STAGE_CHANNEL, '--expires', '7d', '--config', 'firebase.json', '--project', project, '--json']
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = envValue(env, name)
  if (!value) throw new Error(`${name} is not set`)
  return value
}

async function main(env: NodeJS.ProcessEnv): Promise<number> {
  const project = envValue(env, 'FIREBASE_PROJECT_ID') || 'bradthome'
  const signIn = path.join(required(env, 'RUNNER_TEMP'), 'google-sign-in.json')
  const lines: string[] = []
  try {
    writeFileSync(signIn, `${JSON.stringify(credentialsFor(env))}\n`, { mode: 0o600 })
    const deploy = spawnSync('firebase', stageArgs(project), { encoding: 'utf8', env: { ...env, GOOGLE_APPLICATION_CREDENTIALS: signIn } })
    let body: { status?: unknown; error?: unknown } = {}
    try {
      body = JSON.parse(deploy.stdout ?? '') as typeof body
    } catch {
      body = {}
    }
    if (deploy.status !== 0 || body.status !== 'success') {
      throw new Error(
        `the Firebase CLI didn't stage the build: ${typeof body.error === 'string' ? body.error : `exit ${String(deploy.status)}`}`,
      )
    }

    const hosting = new Hosting({ token: await actionsGoogleToken(env, required(env, 'GCP_PREVIEW_SERVICE_ACCOUNT')) })
    const staged = await hosting.channel(project, STAGE_CHANNEL)
    const version = staged.release?.version.name
    if (version === undefined) throw new Error(`the ${STAGE_CHANNEL} channel has no release after the deploy`)
    lines.push(`✓ stage  version ${versionId(version)} is on ${staged.url}`)

    const liveVersion = (await hosting.channel(project, 'live')).release?.version.name
    if (liveVersion === undefined) throw new Error('the live channel has no release to compare with')
    const result = await preReleaseCheck({
      liveBase: LIVE_URL,
      candidateBase: staged.url,
      livePaths: livePathsOf(await hosting.files(liveVersion)),
      fetch,
      wordsMayChange: envValue(env, 'WORDS_MAY_CHANGE') === 'true',
    })
    lines.push(...result.lines)
    if (!result.ok) return 1
    appendFileSync(required(env, 'GITHUB_OUTPUT'), `version=${version}\nurl=${staged.url}\n`)
    lines.push(`  Next: Brad approves the release job in the production environment, and ${versionId(version)} goes live.`)
    return 0
  } catch (error) {
    lines.push(`✖ stage  ${reason(error)}`, '  Nothing was released.')
    return 1
  } finally {
    rmSync(signIn, { force: true })
    console.log(lines.join('\n'))
    const summary = envValue(env, 'GITHUB_STEP_SUMMARY')
    if (summary) appendFileSync(summary, `\`\`\`\n${lines.join('\n')}\n\`\`\`\n`)
  }
}

if (import.meta.main) process.exitCode = await main(process.env)
