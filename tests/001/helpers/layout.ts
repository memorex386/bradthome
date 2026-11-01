import { readFileSync } from 'node:fs'
import path from 'node:path'
import { writeFile } from './repo.ts'
import { describeRun, run } from './run.ts'
import type { Sandbox } from './sandbox.ts'

// A scratch folder laid out like the repo, with git so that scripts that list
// files through git see the same files as scripts that walk the folder.

export interface Layout {
  root: string
  write(file: string, content: string): void
  read(file: string): string
  /** Stages every change, so git and the folder agree. */
  stage(): void
}

export function createLayout(sandbox: Sandbox, files: Record<string, string>, name = 'layout'): Layout {
  const root = sandbox.path(name)
  const git = (args: readonly string[]): void => {
    const result = run('git', args, { cwd: root, env: sandbox.env })
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed\n${describeRun(result)}`)
  }
  const layout: Layout = {
    root,
    write: (file, content) => writeFile(root, file, content),
    read: (file) => readFileSync(path.join(root, file), 'utf8'),
    stage: () => git(['add', '--all']),
  }
  for (const [file, content] of Object.entries(files)) layout.write(file, content)
  git(['init', '--quiet', '--initial-branch=main', '.'])
  layout.stage()
  return layout
}
