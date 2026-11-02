import { git, splitZ, topLevel } from '../lib/git.ts'
import { ciCrashed, k9 } from '../lib/messages.ts'
import { specFolderNumber, traceSpec } from '../lib/trace.ts'

// The trace job (FR-012, S3.4): every spec with a tests.lock is traced, and
// fails for each ID no test name leads. A spec with no tests.lock yet, such as
// one at Gate 1, is listed as not traced yet and doesn't fail. pnpm trace keeps
// its own exit codes for a single spec, which spec 001's tests pin.

const SPEC_MD = /^specs\/([^/]+)\/spec\.md$/
const LOCK = /^specs\/([^/]+)\/tests\.lock$/

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const files = splitZ(git(['ls-files', '-z', '--', 'specs'], { cwd: root }))
  const locked = new Set(files.map((file) => LOCK.exec(file)?.[1]).filter((spec) => spec !== undefined))
  const specs = files
    .map((file) => SPEC_MD.exec(file)?.[1])
    .filter((spec): spec is string => spec !== undefined && specFolderNumber(spec) !== undefined)
    .sort()

  const lines: string[] = []
  let traced = 0
  let failed = 0
  for (const spec of specs) {
    const folder = `specs/${spec}`
    if (!locked.has(spec)) {
      lines.push(`… trace  ${folder} is not traced yet: it has no tests.lock`)
      continue
    }
    traced += 1
    const { ids, missing } = traceSpec(root, folder, specFolderNumber(spec) ?? '')
    if (missing.length === 0) continue
    failed += 1
    lines.push(...k9(folder, missing, ids.length))
  }
  if (failed === 0) lines.push(`✓ trace  every ID in ${traced} locked ${traced === 1 ? 'spec' : 'specs'} leads a test name`)
  console.log(lines.join('\n'))
  return failed === 0 ? 0 : 1
}

try {
  process.exitCode = main()
} catch {
  console.log(ciCrashed('trace').join('\n'))
  process.exitCode = 1
}
