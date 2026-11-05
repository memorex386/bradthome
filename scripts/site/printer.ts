import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// pnpm printer:install: installs WeasyPrint, which prints the résumé PDFs
// (spec 015, D139), into node_modules/.printer. It runs in the pinned
// Playwright container, whose Python 3.12 and Pango WeasyPrint uses: CI's
// build jobs run it there, and so does pnpm test:visual. The container has no
// pip, so this fetches pip's own zipapp, pinned by version and hash, and pip
// installs scripts/site/resume/requirements.txt with --require-hashes, so
// every package is the one its hash names. A second run with the same
// requirements does nothing.

const ROOT = path.resolve(import.meta.dirname, '..', '..')

/** Where the printer's packages go: ignored, and a Docker volume in pnpm test:visual. */
export const PRINTER_DIR = path.join(ROOT, 'node_modules', '.printer')

/** The requirements, pinned by hash. */
export const REQUIREMENTS = path.join(ROOT, 'scripts', 'site', 'resume', 'requirements.txt')

/** pip's zipapp, from PyPA's bootstrap site, pinned by version and hash. */
export const PIP = {
  version: '26.0.1',
  url: 'https://bootstrap.pypa.io/pip/zipapp/pip-26.0.1.pyz',
  sha256: '0b82eb2cd75d2b56878d85471f9e6103d50fcaabdf637460e7addadeaf71e0b5',
} as const

/** The file that records which requirements the folder holds. */
const STAMP = path.join(PRINTER_DIR, '.requirements.sha256')

const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex')

/** Whether the printer is installed, from these requirements. */
export function printerInstalled(): boolean {
  if (!existsSync(path.join(PRINTER_DIR, 'weasyprint'))) return false
  return existsSync(STAMP) && readFileSync(STAMP, 'utf8').trim() === sha256(readFileSync(REQUIREMENTS))
}

function fail(problem: string, fix: string): number {
  console.log([`✖ printer:install  ${problem}`, `  Fix: ${fix}`].join('\n'))
  return 1
}

async function main(): Promise<number> {
  if (printerInstalled()) {
    console.log('✓ printer:install  WeasyPrint is already installed')
    return 0
  }
  if (process.platform !== 'linux')
    return fail('WeasyPrint installs only in the pinned Playwright container', 'run pnpm test:visual, which installs it there.')
  const response = await fetch(PIP.url)
  if (!response.ok)
    return fail(`pip ${PIP.version} didn't download (HTTP ${response.status})`, 'check the network, then pnpm printer:install again.')
  const pip = Buffer.from(await response.arrayBuffer())
  if (sha256(pip) !== PIP.sha256)
    return fail(`pip ${PIP.version}'s hash doesn't match the pinned one`, "don't use it; check PIP in scripts/site/printer.ts.")
  const zipapp = path.join(tmpdir(), `pip-${PIP.version}.pyz`)
  writeFileSync(zipapp, pip)
  rmSync(PRINTER_DIR, { recursive: true, force: true })
  mkdirSync(PRINTER_DIR, { recursive: true })
  const result = spawnSync(
    'python3',
    [
      zipapp,
      'install',
      '--quiet',
      '--disable-pip-version-check',
      '--root-user-action=ignore',
      '--no-deps',
      '--only-binary=:all:',
      '--require-hashes',
      '--target',
      PRINTER_DIR,
      '--requirement',
      REQUIREMENTS,
    ],
    { stdio: 'inherit' },
  )
  rmSync(zipapp, { force: true })
  if (result.status !== 0)
    return fail('pip could not install the requirements', "read pip's message above, then pnpm printer:install again.")
  writeFileSync(STAMP, `${sha256(readFileSync(REQUIREMENTS))}\n`)
  console.log('✓ printer:install  WeasyPrint is installed')
  return 0
}

if (import.meta.main) process.exitCode = await main()
