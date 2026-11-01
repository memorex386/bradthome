import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { git, splitZ, topLevel } from './lib/git.ts'
import { s3 } from './lib/messages.ts'
import { print } from './lib/output.ts'
import { loadTerms, nameHoldsTerm, termLines } from './lib/terms.ts'

// pnpm terms [--files …]: scans every tracked text file for private terms, or
// only the files it names (FR-006). It reports files and lines, never a term.

/** Binary files aren't scanned. Like git, a NUL in the first 8000 bytes marks one. */
function isBinary(bytes: Buffer): boolean {
  return bytes.subarray(0, 8000).includes(0)
}

function main(): number {
  const args = process.argv.slice(2)
  const root = topLevel(process.cwd()) ?? process.cwd()
  const loaded = loadTerms(process.env, root)
  if ('problem' in loaded) {
    print(s3('terms', loaded.problem, loaded.source), undefined, process.stdout)
    return 1
  }
  const terms = loaded.terms
  const files =
    args[0] === '--files'
      ? args.slice(1).map((file) => path.relative(root, path.resolve(file)).replaceAll('\\', '/'))
      : splitZ(git(['ls-files', '-z'], { cwd: root }))

  const places: string[] = []
  let hiddenPaths = 0
  let scanned = 0
  for (const file of files) {
    if (nameHoldsTerm(file, terms)) {
      hiddenPaths += 1
      continue
    }
    const full = path.join(root, file)
    let bytes: Buffer
    try {
      if (!statSync(full).isFile()) continue
      bytes = readFileSync(full)
    } catch {
      continue
    }
    if (isBinary(bytes)) continue
    scanned += 1
    for (const line of termLines(bytes.toString('utf8'), terms)) places.push(`  ${file}:${line}`)
  }

  if (places.length === 0 && hiddenPaths === 0) {
    print([`✓ terms  no private term in ${scanned} ${scanned === 1 ? 'file' : 'files'}`], terms, process.stdout)
    return 0
  }
  const paths =
    hiddenPaths === 0
      ? []
      : [`  ${hiddenPaths} ${hiddenPaths === 1 ? "file's path holds" : "files' paths hold"} a private term. The paths aren't shown.`]
  print(
    [
      '✖ terms  private term',
      ...places,
      ...paths,
      "  A term on Brad's private list is in these files. The term isn't shown.",
      "  Fix: remove or reword those lines. If it's a false match, ask Brad to refine the list.",
    ],
    terms,
    process.stdout,
  )
  return 1
}

process.exitCode = main()
