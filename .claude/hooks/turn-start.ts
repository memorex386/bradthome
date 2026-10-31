import { existsSync } from 'node:fs'
import path from 'node:path'
import { runGit, topLevel } from './lib/git.ts'
import { type HookInput, inputCwd, parseInput, readStdin } from './lib/io.ts'
import { saveSnapshot, snapshotFile, takeSnapshot } from './lib/turns.ts'

// The UserPromptSubmit hook. At the start of each turn it records the working
// tree, so the Stop hook can tell what the turn changed (FR-022, S5.2). It also
// reminds the agent when the checkout's git hooks are off, as in a new
// worktree before pnpm install.

const REMINDER =
  'The git hooks are off in this checkout, so commits here skip every check. Run pnpm install here before you commit.'

/** Whether a checkout that uses husky has its hooks switched off. */
export function hooksOff(root: string): boolean {
  if (!existsSync(path.join(root, '.husky'))) return false
  const configured = runGit(['config', '--get', 'core.hooksPath'], root).stdout.trim()
  const expected = path.resolve(root, '.husky', '_')
  return configured === '' || path.resolve(root, configured) !== expected || !existsSync(path.join(expected, 'h'))
}

function start(input: HookInput): void {
  const root = topLevel(inputCwd(input))
  if (root === undefined) return
  const file = snapshotFile(root, typeof input.session_id === 'string' ? input.session_id : '')
  if (file !== undefined) saveSnapshot(file, takeSnapshot(root))
  // What a UserPromptSubmit hook prints goes to the agent as context.
  if (hooksOff(root)) process.stdout.write(`${REMINDER}\n`)
}

const input = parseInput(await readStdin())
if (input !== undefined) start(input)
