import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { OFF_PAPER } from '../../../apps/site/src/components/home/hopper.ts'
import { finishedOf, offerOf, phoneOf, rich, summaryOf, traceOf } from '../../../apps/site/src/components/replay/render.ts'
import {
  CONTROLS,
  LABEL,
  OFFERS,
  PAGE,
  PATHS,
  READ,
  stepsOf,
  totalOf,
  wordsOf,
  type Step,
} from '../../../apps/site/src/components/replay/replay.ts'
import { claimIdsOf, resumeOf, ROLES, type ResumeContent } from '../../../apps/site/src/components/resume/resume.ts'

// Spec 047's words and steps, as pure functions: every word is one Brad
// approved in words.md and breaks none of the replay's rules (FR-002, S1.6),
// both paths play their steps in order (S1.2, S1.4), the markup escapes
// every word and marks what was chosen (S3.2), and the PDFs leave the four
// new claims off paper (FR-010, S5.6).

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const site = (...parts: string[]) => path.join(ROOT, 'apps', 'site', ...parts)
const read = (file: string) => readFileSync(file, 'utf8')
const WORDS = read(path.join(ROOT, 'specs', '047-offer-agent-replay', 'words.md'))
const plain = (text: string) => text.replace(/\*\*|\[\[|\]\]/g, '').replace(/\s+/g, ' ')

/** The replay's own generic names, written here, the only code-like words it may show. */
const GENERIC = new Set([
  'show_offer',
  'show_summary',
  'search_news_weather',
  'offer_viewed',
  'offer_accepted',
  'offer_declined',
  'flow_completed',
  'cancel_any_reason',
  'first_name',
  'past_trips',
  'delay_h',
  'rebook_cap',
  'refund_pct',
  'cutoff_h',
])

const AIRLINES =
  /\b(?:American|Delta|United|Southwest|Alaska|JetBlue|Spirit|Frontier|Allegiant|Hawaiian|Sun Country|Air Canada|WestJet|Lufthansa|British Airways|Air France|KLM|Emirates|Qatar|Ryanair|easyJet)\b/

describe('the words (FR-002, S1.6)', () => {
  test('FR-002 S1.6 every word the replay shows is in words.md, as Brad approved it', () => {
    const words = wordsOf()
    expect(words.length).toBeGreaterThan(80)
    for (const word of words) expect(plain(WORDS), word).toContain(plain(word))
  })

  test('FR-002 S1.6 no word names an airline, says insurance or coverage, or gives an eval pass rate', () => {
    for (const word of wordsOf()) {
      expect(word, word).not.toMatch(AIRLINES)
      expect(word, word).not.toMatch(/insur|coverage|covered|\bcovers?\b/i)
      if (/eval|judge|pass/i.test(word)) expect(word, word).not.toMatch(/\d+\s*%/)
    }
  })

  test("FR-002 S1.6 no code-like name but the replay's own generic ones, no short internal offer name, and no URL", () => {
    for (const word of wordsOf()) {
      for (const name of word.match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? []) expect(GENERIC, `${name} in ${word}`).toContain(name)
      expect(word, word).not.toMatch(/\b[a-z]+(?:-[a-z]+){1,}-(?:card|offer|complete)\b/)
      expect(word, word).not.toMatch(/\b[A-Z][a-z]+(?:[A-Z][a-z]+){2,}\b/)
      expect(word, word).not.toMatch(/\b(?:PDA|CFAR|pda|cfar)\b/)
      expect(word, word).not.toMatch(/https?:|www\.|\.com\b/)
    }
  })

  test('S1.5 FR-007 the label says it is an illustration with sample values, and its link names the page', () => {
    expect(LABEL).toBe(
      "An illustration drawn from Brad's account, not a screenshot or a real trace. The flight, prices, risks, terms and data are sample values.",
    )
    expect(READ).toBe('Read the conversation')
    expect(PAGE).toBe('/offer-agent')
  })

  test('S2.1 FR-005 the controls, in order, with Pause first', () => {
    expect([CONTROLS.pause, CONTROLS.restart, CONTROLS.accepts, CONTROLS.declines]).toEqual(['Pause', 'Restart', 'Accepts first', 'Declines first'])
    expect(CONTROLS.play).toBe('Play')
  })
})

/** The phone's steps of a path, as a short list. */
function phoneOfPath(steps: Step[]): string[] {
  return steps.flatMap((step) => {
    if ('ai' in step) return ['ai']
    if ('offer' in step) return [`offer ${step.offer}`]
    if ('pills' in step) return ['pills']
    if ('type' in step) return [`type ${step.type}`]
    if ('pick' in step) return [`pick ${step.pick[0]} ${step.pick[1] ? 'yes' : 'no'}`]
    if ('summary' in step) return [`summary ${step.summary.join(' ')}`]
    return []
  })
}

describe('the steps (S1.2, S1.4)', () => {
  test('S1.2 the accepts path plays the opening, a typed question, the decision, the second offer and the summary, in order', () => {
    expect(phoneOfPath(stepsOf('accepts'))).toEqual([
      'ai',
      'offer a',
      'pills',
      "type What if it's only delayed 90 minutes?",
      'ai',
      'pills',
      "type Yeah, I'll take it",
      'pick a yes',
      'ai',
      'offer b',
      'pills',
      'type No thanks',
      'pick b no',
      'summary true false',
    ])
  })

  test('S1.4 the declines path declines the first, frames the second as peace of mind before the trip, and accepts it', () => {
    const steps = stepsOf('declines')
    expect(phoneOfPath(steps).slice(6)).toEqual([
      "type I don't think I need that",
      'pick a no',
      'ai',
      'offer b',
      'pills',
      'type Yeah, add that',
      'pick b yes',
      'summary false true',
    ])
    const framing = steps.filter((step): step is { ai: string } => 'ai' in step)[2]?.ai
    expect(framing).toMatch(/^No problem\. If what you'd really like is peace of mind before the trip/)
  })

  test('S1.2 the trace opens with what was fetched before the first word, and ends on the release gate', () => {
    for (const path of PATHS) {
      const steps = stepsOf(path)
      expect(steps[0]).toEqual({ sec: 'Before the first word' })
      const lines = steps.flatMap((step) => ('tr' in step ? [step.tr] : []))
      expect(lines.slice(0, 3).map((line) => line[0])).toEqual(['prefetch', 'prefetch', 'prefetch'])
      expect(lines.at(-1)?.[1]).toBe('Release gate')
      const sections = steps.flatMap((step) => ('sec' in step ? [step.sec] : []))
      expect(sections).toEqual(['Before the first word', 'Opening', 'A typed question', 'Decision', 'Second offer', 'Summary'])
    }
  })

  test('S1.4 the summary adds $9 on the accepts path and $38 on the declines path', () => {
    expect(totalOf(true, false)).toBe('$9')
    expect(totalOf(false, true)).toBe('$38')
    expect(summaryOf(true, false)).toContain('Added · $9')
    expect(summaryOf(false, true)).toContain('Added · $38')
  })
})

describe('the markup (S3.2)', () => {
  test('S3.2 every word is escaped, and only the offers mark bold and money', () => {
    expect(rich('<b>&"x"</b>')).toBe('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;')
    expect(rich('a **b** [[c]]')).toBe('a <b>b</b> <span class="r-money">c</span>')
    expect(phoneOf()).toContain('Ask about your options…')
    expect(traceOf()).toContain('Under the hood')
  })

  test("S3.2 a finished frame holds the whole conversation and trace, with the traveler's lines and the chosen buttons named", () => {
    for (const path of PATHS) {
      const { chat, log } = finishedOf(path)
      const typed = stepsOf(path).flatMap((step) => ('type' in step ? [step.type] : []))
      expect(chat.match(/<span class="r-sr">Traveler: <\/span>/g)?.length).toBe(typed.length)
      expect(chat.match(/class="r-(?:btn|no) r-pick"><span class="r-sr">chosen: <\/span>/g)?.length).toBe(2)
      expect(chat).toContain('Your trip options')
      expect(log.match(/class="r-ent"/g)?.length).toBe(stepsOf(path).filter((step) => 'tr' in step).length)
    }
  })

  test("S1.2 an offer's card holds its title, its three lines, its button and its no", () => {
    for (const offer of ['a', 'b'] as const) {
      const html = offerOf(offer)
      expect(html).toContain(OFFERS[offer].title)
      expect(html.match(/<li>/g)?.length).toBe(3)
      expect(html).toContain(OFFERS[offer].yes)
      expect(html).toContain('No, thanks')
      expect(html).not.toMatch(/<img|href=|src=/)
    }
  })
})

describe('the PDFs (FR-010, S5.6)', () => {
  function content(): ResumeContent {
    const folder = (name: string) =>
      readdirSync(site('content', name))
        .filter((file) => file.endsWith('.yaml'))
        .map((file) => ({ id: file.slice(0, -'.yaml'.length), ...(parse(read(site('content', name, file))) as object) }))
    const claims = Object.entries(parse(read(site('content', 'claims.yaml'))) as Record<string, object>).map(([id, claim]) => ({ id, ...claim }))
    return {
      jobs: folder('jobs') as unknown as ResumeContent['jobs'],
      projects: folder('projects') as unknown as ResumeContent['projects'],
      claims: claims as unknown as ResumeContent['claims'],
    }
  }

  test('FR-010 S5.6 the paper list names the four new claims', () => {
    expect([...OFF_PAPER]).toEqual(['hopper-fintech-ai-2', 'hopper-fintech-ai-3', 'hopper-fintech-ai-4', 'hopper-fintech-ai-5'])
  })

  test('FR-010 S5.6 every résumé prints its Hopper claims but the four new ones, and the first Fintech AI line stays', () => {
    const source = content()
    for (const role of ROLES) {
      const ids = claimIdsOf(resumeOf(role, source))
      for (const id of OFF_PAPER) expect(ids, `${role} ${id}`).not.toContain(id)
      expect(ids, role).toContain('hopper-fintech-ai-1')
      const hopper = source.claims.filter((claim) => claim.subject === 'hopper' && !OFF_PAPER.includes(claim.id) && claim.topic !== 'Stack')
      for (const claim of hopper) expect(ids, `${role} ${claim.id}`).toContain(claim.id)
    }
  })
})
