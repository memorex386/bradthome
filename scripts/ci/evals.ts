import { readFileSync } from 'node:fs'
import path from 'node:path'
import { topLevel } from '../lib/git.ts'
import { evalsPass, evalsProblems, RESULTS_FILE } from '../lib/evals.ts'
import { ciCrashed } from '../lib/messages.ts'
import { print } from '../lib/output.ts'

// The evals job (spec 023's FR-008, D194): the last eval run in
// apps/evals/results.json passed, and its fingerprint matches the checkout's
// prompt, model, judge, checks and cases.

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const read = (file: string): string | undefined => {
    try {
      return readFileSync(path.join(root, file), 'utf8')
    } catch {
      return undefined
    }
  }
  const problems = evalsProblems(read)
  if (problems.length > 0) {
    print(problems, undefined)
    return 1
  }
  print([evalsPass(RESULTS_FILE)], undefined)
  return 0
}

try {
  process.exitCode = main()
} catch {
  print(ciCrashed('evals'), undefined)
  process.exitCode = 1
}
