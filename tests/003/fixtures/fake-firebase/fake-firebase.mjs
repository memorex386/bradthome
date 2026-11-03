// A fake Firebase CLI for spec 003's preview-deploy tests. It never reaches
// Google. It logs each call to calls.jsonl, in the folder its launcher passes
// first, with the config file the call names as it was at that moment, then
// prints scenario.json's stdout and exits with its status.

import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const [folder = '.', ...args] = process.argv.slice(2)
const scenario = JSON.parse(readFileSync(path.join(folder, 'scenario.json'), 'utf8'))
const at = args.indexOf('--config')
const config = at >= 0 ? args[at + 1] : undefined
const configText = config !== undefined && existsSync(config) ? readFileSync(config, 'utf8') : null
appendFileSync(path.join(folder, 'calls.jsonl'), `${JSON.stringify({ args, cwd: process.cwd(), configText })}\n`)

process.stdout.write(scenario.stdout ?? '')
process.exitCode = scenario.status ?? 0
