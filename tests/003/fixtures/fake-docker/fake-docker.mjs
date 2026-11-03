// A fake docker for spec 003's setup-check tests. It never starts a container.
// It answers `docker version` and `docker info` from scenario.json, in the
// folder its launcher passes first, and logs each call to calls.jsonl there.
// Any other command fails with a message that names it.

import { appendFileSync, readFileSync } from 'node:fs'
import path from 'node:path'

const [folder = '.', ...args] = process.argv.slice(2)
const scenario = JSON.parse(readFileSync(path.join(folder, 'scenario.json'), 'utf8'))
appendFileSync(path.join(folder, 'calls.jsonl'), `${JSON.stringify({ args })}\n`)

const command = args.find((arg) => !arg.startsWith('-'))
if (command === 'version' || command === 'info') {
  if (scenario.daemon === false) {
    process.stdout.write('Client:\n Version:           29.9.2\n')
    process.stderr.write('Cannot connect to the Docker daemon. Is the docker daemon running?\n')
    process.exitCode = 1
  } else {
    process.stdout.write(args.includes('--format') ? '29.9.2\n' : 'Client:\n Version:           29.9.2\n\nServer:\n Engine:\n  Version:          29.9.2\n')
  }
} else {
  process.stderr.write(`fake docker: ${args.join(' ')} isn't supported here\n`)
  process.exitCode = 1
}
