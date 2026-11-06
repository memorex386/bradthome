import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { FILES, FOLDER, ROLES, sourceOf } from '../../apps/site/src/components/resume/resume.ts'
import { printerInstalled, PRINTER_DIR } from './printer.ts'

// The résumé PDFs (spec 015). Astro builds a print page for each role in
// dist/resume, and this integration prints each one into its PDF with
// WeasyPrint, then removes the print pages, so the site serves the PDFs
// alone (D139). The PDFs are built from source on every build, never by hand,
// so they can't drift from the site. Every build prints them, the release's
// included, since v2.0 serves them (spec 019).
//
// WeasyPrint runs only in the pinned Playwright container, where CI's build
// jobs and pnpm test:visual install it with pnpm printer:install. A build in
// CI without it fails. A build elsewhere, such as on Windows, says so and
// leaves the PDFs out.

const PRINT = path.join(import.meta.dirname, 'resume', 'print.py')

/** Each print page and the PDF it prints, as paths inside dist. */
export const JOBS: readonly { source: string; output: string }[] = ROLES.map((role) => ({
  source: sourceOf(role),
  output: `${FOLDER}/${FILES[role]}`,
}))

/** Removes the print pages from dist. */
export function clean(dist: string): void {
  for (const job of JOBS) rmSync(path.join(dist, job.source), { force: true })
  rmSync(path.join(dist, REPRINT), { recursive: true, force: true })
  // A build with no printer leaves the folder empty, so it goes too.
  const folder = path.join(dist, FOLDER)
  if (existsSync(folder) && readdirSync(folder).length === 0) rmSync(folder, { recursive: true })
}

/** Where the second print goes, to check it matches the first, inside dist so the fonts resolve. */
export const REPRINT = `${FOLDER}/.reprint`

/** The args that print every PDF with the printer's Python, into `into` inside dist. */
export function printArgs(dist: string, into = FOLDER): string[] {
  return [PRINT, dist, ...JOBS.flatMap((job) => [job.source, `${into}/${path.posix.basename(job.output)}`])]
}

function print(dist: string, into: string): string | undefined {
  const result = spawnSync('python3', printArgs(dist, into), {
    encoding: 'utf8',
    env: {
      ...process.env,
      PYTHONPATH: PRINTER_DIR,
      PYTHONDONTWRITEBYTECODE: '1',
      PYTHONUTF8: '1',
      PYTHONHASHSEED: '0',
      SOURCE_DATE_EPOCH: '0',
    },
  })
  if (result.status !== 0) return `WeasyPrint failed:\n${result.stdout ?? ''}${result.stderr ?? ''}`
  return undefined
}

/** The PDFs whose two prints differ, by their output path. */
export function differing(dist: string): string[] {
  return JOBS.filter((job) => {
    const first = path.join(dist, job.output)
    const second = path.join(dist, REPRINT, path.basename(job.output))
    return !existsSync(first) || !existsSync(second) || !readFileSync(first).equals(readFileSync(second))
  }).map((job) => job.output)
}

/**
 * Prints every PDF into dist, then prints them again and checks the bytes
 * match, so any build of the same source serves the same files (S4.2).
 * Returns a problem, or nothing when they printed.
 */
export function printPdfs(dist: string): string | undefined {
  const problem = print(dist, FOLDER) ?? print(dist, REPRINT)
  if (problem !== undefined) return problem
  const missing = JOBS.filter((job) => !existsSync(path.join(dist, job.output)))
  if (missing.length > 0) return `WeasyPrint didn't write ${missing.map((job) => job.output).join(', ')}.`
  const changed = differing(dist)
  rmSync(path.join(dist, REPRINT), { recursive: true, force: true })
  if (changed.length > 0) return `A second print of the same source gave different bytes: ${changed.join(', ')}.`
  return undefined
}

export const resumePdfs = {
  name: 'bradthome:resume-pdfs',
  hooks: {
    'astro:build:done': ({ dir, logger }: { dir: URL; logger: { info(message: string): void; warn(message: string): void } }) => {
      const dist = fileURLToPath(dir)
      if (!printerInstalled()) {
        clean(dist)
        if (process.env.CI !== undefined && process.env.CI !== '')
          throw new Error('The résumé PDFs need WeasyPrint: run pnpm printer:install in the pinned Playwright container before the build.')
        logger.warn(
          'WeasyPrint is not installed here, so this build has no résumé PDFs. pnpm test:visual builds them in the pinned container.',
        )
        return
      }
      const problem = printPdfs(dist)
      clean(dist)
      if (problem !== undefined) throw new Error(problem)
      logger.info(`Printed the résumé PDFs: ${JOBS.map((job) => job.output).join(', ')}.`)
    },
  },
}
