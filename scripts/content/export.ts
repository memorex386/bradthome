import path from 'node:path'
import { topLevel } from '../lib/git.ts'
import { exportContent } from './notes.ts'

// pnpm content:export --notes <folder>, or with BRADTHOME_NOTES set (D108).
// Writes apps/site/content/claims.yaml from the notes' public bullets.

const root = topLevel(process.cwd()) ?? process.cwd()
const result = exportContent({
  args: process.argv.slice(2),
  env: process.env,
  contentDir: path.join(root, 'apps', 'site', 'content'),
  cwd: root,
})
process.stdout.write(`${result.lines.join('\n')}\n`)
process.exitCode = result.code
