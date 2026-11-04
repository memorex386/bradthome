import { spawnSync } from 'node:child_process'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { envValue } from '../lib/terms.ts'
import { credentialsFor } from './preview-credentials.ts'
import { deployOutcome, previewConfig } from './preview-deploy.ts'

// Deploys main to the `next` channel (spec 009's FR-014, S6.1, S6.2, D117).
// Run from the checkout's root in next.yml's deploy job, after a push to main.
// It signs in as the preview does, with GitHub's identity token swapped for
// the preview service account and no stored key, writes the same noindex copy
// of firebase.json, and has the Firebase CLI put the build on the channel
// `next`, which expires 30 days after the push, Hosting's longest. It never
// names any channel but `next`.

export const CHANNEL = 'next'
const CONFIG = 'firebase.preview.json'
const EXPIRES = '30d'
const FIX =
  "  The gate isn't affected. Fix: re-run the job; if it keeps failing, check the repo's GCP_ variables and Google Cloud's status."

/** The Firebase CLI's arguments for the `next` channel. */
export function nextArgs(project?: string): string[] {
  return [
    'hosting:channel:deploy',
    CHANNEL,
    '--expires',
    EXPIRES,
    '--config',
    CONFIG,
    '--json',
    '--non-interactive',
    ...(project ? ['--project', project] : []),
  ]
}

/** A deploy's result as its log lines, with `next` named instead of the preview. */
export function nextLines(stdout: string, status: number | null): { ok: boolean; lines: string[]; url?: string } {
  const outcome = deployOutcome(stdout, status)
  if (outcome.ok) return { ok: true, url: outcome.url, lines: [`✓ next  ${outcome.url}, expires ${outcome.expires}`] }
  const lines = outcome.lines
    .filter((line) => !line.startsWith("  The gate isn't affected"))
    .map((line) => line.replace(/^✖ preview {2}/, '✖ next  '))
  return { ok: false, lines: [...lines, FIX] }
}

function main(env: NodeJS.ProcessEnv): number {
  if (envValue(env, 'GITHUB_REF') !== 'refs/heads/main') {
    console.log(
      ['✖ next  only main deploys to the next channel', `  This run is on ${envValue(env, 'GITHUB_REF') ?? 'no ref'}.`].join('\n'),
    )
    return 1
  }
  let credentials: Record<string, unknown>
  try {
    credentials = credentialsFor(env)
  } catch (error) {
    console.log([`✖ next  ${error instanceof Error ? error.message : 'a sign-in setting is missing'}`, FIX].join('\n'))
    return 1
  }
  const temp = envValue(env, 'RUNNER_TEMP')
  if (!temp) {
    console.log(['✖ next  RUNNER_TEMP is not set', '  Fix: run this in the next workflow.'].join('\n'))
    return 1
  }
  const file = path.join(temp, 'google-sign-in.json')
  writeFileSync(file, `${JSON.stringify(credentials)}\n`, { mode: 0o600 })
  writeFileSync(CONFIG, `${JSON.stringify(previewConfig(JSON.parse(readFileSync('firebase.json', 'utf8'))), null, 2)}\n`)
  const result = spawnSync('firebase', nextArgs(envValue(env, 'FIREBASE_PROJECT_ID')), {
    env: { ...env, GOOGLE_APPLICATION_CREDENTIALS: file },
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  })
  const outcome =
    result.error !== undefined
      ? { ok: false, lines: [`✖ next  the Firebase CLI could not start`, `  ${result.error.message}`, FIX] }
      : nextLines(result.stdout, result.status)
  if (!outcome.ok && (result.stderr ?? '').trim() !== '') console.log(result.stderr.trim())
  console.log(outcome.lines.join('\n'))
  const summary = envValue(env, 'GITHUB_STEP_SUMMARY')
  if (summary) appendFileSync(summary, `${outcome.lines.join('\n')}\n`)
  return outcome.ok ? 0 : 1
}

if (import.meta.main) process.exitCode = main(process.env)
