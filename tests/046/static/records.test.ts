import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { SCRIPTED } from '../../../apps/evals/src/checks.ts'

// Spec 046, Story 5: the records say what changed, and no page or the evals'
// words still say the chat uses a set phrase.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8')
const D253 = 'docs/decisions/0253-the-chats-prompt-keeps-its-guardrails-and-drops-its-scripting.md'

function filesIn(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir)).flatMap((name) => {
    const file = `${dir}/${name}`
    return statSync(path.join(ROOT, file)).isDirectory() ? filesIn(file) : [file]
  })
}

describe('the records (S5.1, S5.2, FR-007)', () => {
  test('S5.1 FR-007 D253 records the cut, the cards, and that it amends D249, and the index and plan list it', () => {
    const record = read(D253)
    expect(record).toContain('log-id: D253')
    expect(record).toContain('Amends [D249]')
    expect(record).toMatch(/length/i)
    expect(record).toContain('REMINDER')
    expect(read('docs/decisions/README.md')).toContain('0253-the-chats-prompt-keeps-its-guardrails-and-drops-its-scripting.md')
    expect(read('docs/plan.md')).toMatch(/\| 5\.19 A lighter prompt for the chat \|/)
  })

  test('S5.2 FR-007 spec 045 and D249 say D253 amends them', () => {
    expect(read('specs/045-chat-voice/spec.md')).toContain('D253')
    expect(read('docs/decisions/0249-the-chat-speaks-in-a-referral-voice.md')).toContain('D253')
  })

  test('S5.2 no page, and none of the evals’ words, says the chat uses a set phrase', () => {
    const files = [...filesIn('apps/site/src'), ...filesIn('apps/evals/src')].filter(
      // The gallery's held replies show the window, not the prompt; checks.ts holds the phrases to catch.
      (file) =>
        !file.endsWith('components/chat/fixtures.ts') && !file.endsWith('evals/src/checks.ts') && /\.(?:ts|tsx|astro|md|json)$/.test(file),
    )
    expect(files.length).toBeGreaterThan(20)
    for (const file of files) expect(read(file), file).not.toMatch(SCRIPTED)
  })
})
