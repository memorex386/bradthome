import { spawnSync } from 'node:child_process'
import path from 'node:path'

// pnpm test:visual: the end-to-end tests on Brad's PC, in the same pinned
// Playwright container CI runs them in, by the same digest (FR-010, FR-011,
// S2.7, D46). The snapshots match only there, and the Hosting emulator sends
// headers only on Linux. The repo is mounted at /repo. The container gets its
// own node_modules in Docker volumes, since the checkout's hold Windows
// binaries; it installs from the lockfile, builds the site, writes the CSP
// header and runs Playwright with BRADTHOME_CONTAINER=1.
//
//   pnpm test:visual            run every end-to-end test
//   pnpm test:visual --update   write new snapshot baselines in tests/snapshots/003/
//
// Any other arguments go to playwright test, such as a file or --grep.

export const IMAGE = 'mcr.microsoft.com/playwright:v1.64.1-noble@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

export function dockerArgs(root: string, args: readonly string[]): string[] {
  const playwright = args.map((arg) => (arg === '--update' ? '--update-snapshots' : arg))
  const quoted = playwright.map((arg) => `'${arg.replaceAll("'", `'\\''`)}'`).join(' ')
  const script = [
    'set -e',
    'corepack enable',
    'pnpm install --frozen-lockfile',
    'pnpm site:build',
    'pnpm csp --check',
    `pnpm test:e2e ${quoted}`.trim(),
  ].join(' && ')
  return [
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    '-e',
    'BRADTHOME_CONTAINER=1',
    '-e',
    'CI=1',
    '-e',
    'COREPACK_ENABLE_DOWNLOAD_PROMPT=0',
    '-v',
    `${root}:/repo`,
    '-v',
    'bradthome-visual-root-modules:/repo/node_modules',
    '-v',
    'bradthome-visual-site-modules:/repo/apps/site/node_modules',
    '-v',
    'bradthome-visual-pnpm-store:/root/.local/share/pnpm',
    '-w',
    '/repo',
    IMAGE,
    'bash',
    '-c',
    script,
  ]
}

function main(args: readonly string[]): number {
  const result = spawnSync('docker', dockerArgs(ROOT, args), { stdio: 'inherit', windowsHide: true })
  if (result.error !== undefined) {
    console.log(
      ['✖ test:visual  Docker is not installed', '  Fix: install Docker Desktop and start it, then pnpm test:visual again.'].join('\n'),
    )
    return 1
  }
  return result.status ?? 1
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2))
