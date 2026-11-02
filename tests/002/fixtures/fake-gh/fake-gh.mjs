// A fake gh for spec 002's tests. It never reaches GitHub. It replays the
// responses in scenario.json, in the folder its launcher passes first, and
// logs each call to calls.jsonl there.
//
// It answers `gh api <endpoint>` reads and `gh auth status`. {owner} and
// {repo} in an endpoint stand for memorex386 and bradthome, as gh fills them
// in from the checkout's remote. A write, --jq or --template, or any other
// command, fails with a message that names it, so a test shows what the check
// tried to do.

import { appendFileSync, readFileSync } from 'node:fs'
import path from 'node:path'

const [folder = '.', ...args] = process.argv.slice(2)
const scenario = JSON.parse(readFileSync(path.join(folder, 'scenario.json'), 'utf8'))
appendFileSync(path.join(folder, 'calls.jsonl'), `${JSON.stringify({ args })}\n`)

function finish(code, stdout = '', stderr = '') {
  if (stdout !== '') process.stdout.write(stdout)
  if (stderr !== '') process.stderr.write(stderr)
  process.exitCode = code
}

const WITH_VALUE = new Set([
  '-H',
  '--header',
  '-X',
  '--method',
  '-f',
  '--raw-field',
  '-F',
  '--field',
  '--hostname',
  '--cache',
  '--input',
  '-p',
  '--preview',
  '-R',
  '--repo',
])
const UNSUPPORTED = new Set(['-q', '--jq', '-t', '--template'])

function api(rest) {
  let endpoint
  let method = 'GET'
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i] ?? ''
    const [flag, inline] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined]
    if (UNSUPPORTED.has(flag)) return finish(1, '', `fake gh: ${flag} isn't supported; read the JSON instead\n`)
    if (flag === '-X' || flag === '--method') method = (inline ?? rest[i + 1] ?? '').toUpperCase()
    if (flag === '-f' || flag === '-F' || flag === '--field' || flag === '--raw-field' || flag === '--input') {
      if (method === 'GET') method = 'POST'
    }
    if (WITH_VALUE.has(flag)) {
      if (inline === undefined) i += 1
      continue
    }
    if (arg.startsWith('-')) continue
    endpoint ??= arg
  }
  if (method !== 'GET') return finish(1, '', `fake gh: ${method} ${endpoint ?? ''} is a write, and the checks only read\n`)
  if (scenario.offline === true) {
    return finish(1, '', 'error connecting to api.github.com\ncheck your internet connection or https://githubstatus.com\n')
  }
  const key = (endpoint ?? '')
    .replace(/^https:\/\/api\.github\.com\//, '')
    .replace(/^\//, '')
    .replace(/\?.*$/, '')
    .replaceAll('{owner}', 'memorex386')
    .replaceAll('{repo}', 'bradthome')
  const response = scenario.routes?.[key] ??
    scenario.fallback ?? {
      status: 404,
      body: { message: 'Not Found', documentation_url: 'https://docs.github.com/rest', status: '404' },
    }
  const body = `${JSON.stringify(response.body)}\n`
  if (response.status >= 200 && response.status < 300) return finish(0, body)
  return finish(1, body, `gh: ${response.body?.message ?? 'error'} (HTTP ${response.status})\n`)
}

if (args[0] === 'api') api(args.slice(1))
else if (args[0] === 'auth' && args[1] === 'status') {
  if (scenario.offline === true) finish(1, '', 'error connecting to api.github.com\n')
  else finish(0, '', 'github.com\n  ✓ Logged in to github.com account test-agent (keyring)\n')
} else finish(1, '', `fake gh: gh ${args.join(' ')} isn't recorded; only gh api reads and gh auth status are\n`)
