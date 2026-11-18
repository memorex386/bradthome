import { readFileSync } from 'node:fs'
import path from 'node:path'
import { topLevel } from '../lib/git.ts'
import { EVALS_OFF, evalsOff, evalsPass, evalsProblems, RESULTS_FILE } from '../lib/evals.ts'
import { ciCrashed } from '../lib/messages.ts'
import { print } from '../lib/output.ts'

// The evals job (spec 023's FR-008), run in ci's hygiene job: since spec 037
// (D228), every case in the checkout was checked by a run that passed it, the
// last full run in apps/evals/results.json or a changed run in
// apps/evals/changed.json, by the cases' fingerprint. Since D244 it's off by
// default, as apps/evals/settings.json says.

function main(): number {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const read = (file: string): string | undefined => {
    try {
      return readFileSync(path.join(root, file), 'utf8')
    } catch {
      return undefined
    }
  }
  // D244: off by default, so the job passes with a line saying so.
  if (evalsOff(read)) {
    print([EVALS_OFF], undefined)
    return 0
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
