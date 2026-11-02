import path from 'node:path'
import { topLevel } from './lib/git.ts'
import { specFolderNumber, traceSpec } from './lib/trace.ts'

// pnpm trace <spec-dir>: lists every S, FR and SC ID a spec defines, and
// reports each one that no test name in the spec's test folder starts with
// (FR-013, D78). The tracing itself is in lib/trace.ts, which CI shares.

function main(): number {
  const specArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (specArg === undefined) {
    console.error('Usage: pnpm trace <spec-dir>, as in pnpm trace specs/001-hooks-and-agent-rules')
    return 2
  }
  const root = topLevel(process.cwd()) ?? process.cwd()
  const spec = path.relative(root, path.resolve(specArg)).replaceAll('\\', '/')
  const number = specFolderNumber(spec)
  if (number === undefined) {
    console.error(`✖ trace  ${spec} isn't a spec folder: its name starts with a three-digit number`)
    return 2
  }
  const { ids, counts, missing, folder } = traceSpec(root, spec, number)

  const width = Math.max(0, ...ids.map((id) => id.length))
  const lines = ids.map((id) => {
    const count = counts.get(id) ?? 0
    return count === 0
      ? `  ${id.padEnd(width)}  missing: no test name in ${folder}/ starts with it`
      : `  ${id.padEnd(width)}  ${count} ${count === 1 ? 'test' : 'tests'}`
  })
  if (missing.length === 0) {
    console.log([...lines, `✓ trace  each of the ${ids.length} IDs in ${spec}/spec.md leads a test name`].join('\n'))
    return 0
  }
  console.error(
    [
      ...lines,
      `✖ trace  ${missing.length} of the ${ids.length} IDs in ${spec}/spec.md lead no test name`,
      `  Fix: name a test in ${folder}/ for each one, starting with its ID (D78).`,
    ].join('\n'),
  )
  return 1
}

process.exitCode = main()
