import { readFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import { deploy } from '../../../scripts/chat-api/deploy.ts'
import { DEPLOY_UNCHECKED, EVALS_OFF, evalsOff, evalsProblems, RESULTS_FILE, SETTINGS_FILE } from '../../../scripts/lib/evals.ts'

// D244, amending spec 037: the evals are off by default. apps/evals/settings.json
// says "off", and the hygiene job, the pre-push hook and the chat API's deploy
// skip their checks; "on" brings each back unchanged. With no settings file, or
// one that can't be read, the evals are on.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const real = (file: string): string | undefined => {
  try {
    return readFileSync(path.join(ROOT, file), 'utf8')
  } catch {
    return undefined
  }
}
const withSettings =
  (text: string | undefined) =>
  (file: string): string | undefined =>
    file === SETTINGS_FILE ? text : real(file)

describe('the switch (D244)', () => {
  test('the repo’s settings turn the evals off', () => {
    expect(JSON.parse(real(SETTINGS_FILE) ?? '{}')).toEqual({ evals: 'off' })
    expect(evalsOff(real)).toBe(true)
  })

  test('only an exact "off" turns them off: "on", a missing file, bad JSON or another value leave them on', () => {
    expect(evalsOff(withSettings('{"evals":"off"}'))).toBe(true)
    for (const text of ['{"evals":"on"}', undefined, 'not json', '{"evals":false}', '{"evals":"OFF"}', 'null', '{}'])
      expect(evalsOff(withSettings(text)), String(text)).toBe(false)
  })

  test('the gate’s checks don’t change: with the evals on, a stale run still fails as D228 sets', () => {
    const stale = (file: string) => (file === RESULTS_FILE ? undefined : withSettings('{"evals":"on"}')(file))
    expect(evalsProblems(stale)[0]).toBe('✖ evals  no eval run is recorded')
  })

  test('the hygiene job passes while the evals are off, and says so', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'ci', 'evals.ts')], { cwd: ROOT, encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain(EVALS_OFF)
  })

  test('the deploy goes ahead while the evals are off, after saying no run checked it', async () => {
    const printed: string[] = []
    const stale = (file: string) => (file === RESULTS_FILE ? undefined : real(file))
    await deploy([], {
      root: path.resolve('/repo'),
      run: () => ({ status: 1, stdout: '', stderr: 'stopped here' }),
      fetchCorpus: async () => '{}',
      writeFile: () => undefined,
      print: (line) => void printed.push(line),
      readRepo: stale,
    })
    expect(printed.slice(0, DEPLOY_UNCHECKED.length)).toEqual([...DEPLOY_UNCHECKED])
    expect(printed.join('\n')).not.toContain('no full eval run is recorded')
  })
})
