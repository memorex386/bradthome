import { readFileSync } from 'node:fs'
import path from 'node:path'
import { git, splitZ, topLevel } from './lib/git.ts'

// pnpm trace <spec-dir>: lists every S, FR and SC ID a spec defines, and
// reports each one that no test name in the spec's test folder starts with
// (FR-013, D78). It reads the names as text, so it works before the code
// exists. Mock states such as G3 or S3 lead names too, but they aren't spec IDs.

/** A spec defines an ID where it's bold: **S1.1**, **FR-001**, **SC-001**. */
const DEFINED = /\*\*(S\d+\.\d+|FR-\d{3}|SC-\d{3})\*\*/g
const SPEC_ID = /^(?:S\d+\.\d+|FR-\d{3}|SC-\d{3})$/
const LEADING_TOKEN = /^(?:S\d+\.\d+|FR-\d{3}|SC-\d{3}|[GSCE]\d+)$/
/** A test's name: the first argument of test(…) or it(…), in any kind of quotes. */
const TEST_NAME = /(?<![.\w$])(?:test|it)(?:\.\w+)*\(\s*(['"`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g

function leadingIds(name: string): string[] {
  const ids: string[] = []
  for (const token of name.split(/\s+/)) {
    if (!LEADING_TOKEN.test(token)) break
    if (SPEC_ID.test(token)) ids.push(token)
  }
  return ids
}

function main(): number {
  const specArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (specArg === undefined) {
    console.error('Usage: pnpm trace <spec-dir>, as in pnpm trace specs/001-hooks-and-agent-rules')
    return 2
  }
  const root = topLevel(process.cwd()) ?? process.cwd()
  const spec = path.relative(root, path.resolve(specArg)).replaceAll('\\', '/')
  const number = /^(\d{3})-/.exec(path.basename(spec))?.[1]
  if (number === undefined) {
    console.error(`✖ trace  ${spec} isn't a spec folder: its name starts with a three-digit number`)
    return 2
  }
  const ids = [...new Set([...readFileSync(path.join(root, spec, 'spec.md'), 'utf8').matchAll(DEFINED)].map((m) => m[1] ?? ''))]

  const folder = `tests/${number}`
  const tests = new Map<string, number>()
  const files = splitZ(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', folder], { cwd: root }))
  for (const file of new Set(files)) {
    if (!file.endsWith('.test.ts')) continue
    let source: string
    try {
      source = readFileSync(path.join(root, file), 'utf8')
    } catch {
      continue
    }
    for (const match of source.matchAll(TEST_NAME)) {
      for (const id of leadingIds(match[2] ?? '')) tests.set(id, (tests.get(id) ?? 0) + 1)
    }
  }

  const width = Math.max(0, ...ids.map((id) => id.length))
  const missing = ids.filter((id) => !tests.has(id))
  const lines = ids.map((id) => {
    const count = tests.get(id) ?? 0
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
