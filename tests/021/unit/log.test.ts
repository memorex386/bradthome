import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { DAY_LIMIT_USD } from '../../../apps/chat-api/src/constants.ts'
import { LOG_FIELDS } from '../../../apps/chat-api/src/log.ts'
import { ask, harness, partsOf, question, reply } from '../helpers/fakes.ts'

// Spec 021, Story 7: numbers-only logging (FR-009, D175).

const MARK = 'zqxmarker'
const ADDRESS = '192.0.2.77'

describe('the log line', () => {
  test('S7.1 FR-009 one JSON line per question, answered or refused, with only the listed fields', async () => {
    expect([...LOG_FIELDS].sort()).toEqual(
      ['severity', 'event', 'state', 'model', 'inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens', 'costUsd', 'ms', 'sources', 'droppedSources'].sort(),
    )
    const h = harness({ script: { cites: ['job-hopper'] } })
    await partsOf(await ask(h))
    await ask(h, { origin: 'https://bradthome.com', altcha: 'x' })
    await ask(h, { body: '{' })
    await ask(h, { altcha: 'bad' })
    const paused = harness({ spend: { day: DAY_LIMIT_USD } })
    await ask(paused)
    const lines = [...h.lines, ...paused.lines].map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(lines.map((line) => line.state)).toEqual(['answered', 'origin', 'invalid', 'altcha', 'paused'])
    for (const line of lines) {
      expect(Object.keys(line).sort()).toEqual([...LOG_FIELDS].sort())
      expect(line).toMatchObject({ severity: 'INFO', event: 'chat.answer' })
      for (const key of ['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens', 'costUsd', 'ms', 'droppedSources'])
        expect(typeof line[key], key).toBe('number')
      expect(Array.isArray(line.sources)).toBe(true)
    }
  })

  test('S7.2 SC-002 FR-009 a marked question and a marked answer appear in no log line, nor does the address or its daily code', async () => {
    const h = harness({ script: { text: [`An answer with ${MARK}-answer in it.`], cites: ['job-hopper'] } })
    const messages = [question(`Tell me ${MARK}-question one`, 'm0'), reply(`Earlier ${MARK}-reply`, 'm1'), question(`And ${MARK}-question two`, 'm2')]
    await partsOf(await ask(h, { messages, address: ADDRESS }))
    await ask(h, { messages: [question(`q${'x'.repeat(2000)}${MARK}`)], address: ADDRESS })
    const failing = harness({ script: { error: true } })
    await partsOf(await ask(failing, { messages, address: ADDRESS }))
    const all = [...h.lines, ...failing.lines].join('\n')
    expect(all).not.toContain(MARK)
    expect(all).not.toContain(ADDRESS)
    expect(all).not.toMatch(/[0-9a-f]{64}/)
    expect(all).not.toContain('secret-marker-in-error')
  })

  test("S7.3 FR-009 the API's source writes only through log.ts, and never logs a body, a header or the model's text", () => {
    const dir = path.resolve('apps/chat-api/src')
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.ts') && name !== 'testing.ts')) {
      const source = readFileSync(path.join(dir, file), 'utf8')
      if (file === 'log.ts') continue
      expect(source, file).not.toMatch(/console\.|process\.stdout|process\.stderr/)
      expect(source, file).not.toMatch(/logger\(|hono\/logger/)
    }
    const log = readFileSync(path.join(dir, 'log.ts'), 'utf8')
    expect(log).not.toMatch(/\.\.\.\s*fields|JSON\.stringify\(fields\)/)
  })
})
