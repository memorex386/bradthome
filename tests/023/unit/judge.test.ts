import { describe, expect, test } from 'vitest'
import { JUDGE_MODEL, judgePrompt, parseVerdict, RUBRIC } from '../../../apps/evals/src/judge.ts'

// Spec 023's S1.4 and FR-005: the judge sees one answer and its cited
// sources, and only a verdict in the fixed shape counts (D195).

const SOURCES = [{ id: 'job-hopper', label: 'Résumé · Hopper', text: 'Senior Software Engineer at Hopper, Apr 2022 – Oct 2026.' }]

describe('the judge', () => {
  test('FR-005 is Sonnet 5.5, a different model from the one that answers', () => {
    expect(JUDGE_MODEL).toBe('claude-sonnet-5-5')
  })

  test('FR-005 sees the question, the answer and the cited sources’ labels and text, and nothing else from the corpus', () => {
    const prompt = judgePrompt('When was Brad at Hopper?', 'Brad was at Hopper from 2022 to 2026.', SOURCES)
    expect(prompt).toContain('When was Brad at Hopper?')
    expect(prompt).toContain('Brad was at Hopper from 2022 to 2026.')
    expect(prompt).toContain('job-hopper')
    expect(prompt).toContain('label="Résumé · Hopper"')
    expect(prompt).toContain(SOURCES[0]?.text)
    expect(prompt).not.toContain('Bleacher Report')
    expect(RUBRIC).toMatch(/"verdict"/)
  })

  test('FR-005 S1.5 sees a follow-up’s earlier turns, as context before the question', () => {
    const prompt = judgePrompt('And before that?', 'Brad was at Bleacher Report.', SOURCES, [
      { role: 'user', text: 'What did Brad do at Hopper?' },
      { role: 'assistant', text: 'Brad was at Hopper.' },
    ])
    expect(prompt.indexOf('<earlier role="visitor">What did Brad do at Hopper?</earlier>')).toBe(0)
    expect(prompt).toContain('<earlier role="chat">Brad was at Hopper.</earlier>')
    expect(prompt.indexOf('<earlier')).toBeLessThan(prompt.indexOf('<question>'))
    expect(RUBRIC).toMatch(/earlier turns/)
  })

  test('S1.4 a verdict in the fixed JSON shape is read, with its reason', () => {
    expect(parseVerdict('{"verdict":"supported","reason":"Each claim matches job-hopper."}')).toEqual({
      verdict: 'supported',
      reason: 'Each claim matches job-hopper.',
    })
    expect(parseVerdict('Checking each claim.\n{"verdict":"supported","reason":"It matches."}')).toEqual({ verdict: 'supported', reason: 'It matches.' })
    expect(parseVerdict('```json\n{"verdict":"unsupported","reason":"The year is wrong."}\n```')).toEqual({
      verdict: 'unsupported',
      reason: 'The year is wrong.',
    })
  })

  test('S1.4 any other reply is unreadable, never a pass', () => {
    for (const reply of ['', 'Supported.', '{"verdict":"yes","reason":"ok"}', '{"verdict":"supported"}', '{"verdict":"supported","reason":"x","extra":1}']) {
      expect(parseVerdict(reply).verdict, reply).toBe('unreadable')
    }
  })
})
