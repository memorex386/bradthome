import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { checkPrep, citableOf, PREP_SYSTEM, prepPromptOf } from '../../../apps/chat-api/src/prep.ts'
import { BOUNDARY, contextOf, NO_SOURCE, OFF_TOPIC, SYSTEM_PROMPT, WANT_CONTEXT } from '../../../apps/chat-api/src/prompt.ts'
import { parseCorpus } from '../../../apps/chat-api/src/corpus.ts'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'
import { TRACK_WORDS, tracksFor, wantsFrom } from '../../../apps/site/src/components/chat/wants.ts'
import { PREP } from '../../../apps/site/src/components/chat/words.ts'
import {
  anchorOf,
  ASK,
  EMAIL,
  EYEBROW,
  HEADING,
  PROOF,
  prepWantsOf,
  ROW_LABELS,
  THIS_PAGE,
  tracksOf,
  wantsOf,
} from '../../../apps/site/src/components/home/looking-for.ts'
import { WANT_SLOTS, type Want, wantsSchema } from '../../../apps/site/src/content/schema.ts'
import { corpusOf, type CorpusInput, llmsOf, LOOKING_FOR_NOTE } from '../../../apps/site/src/corpus/corpus.ts'
import { essayTitleOf } from '../../../apps/site/src/corpus/essay.ts'
import { exportContent, parseWants, renderWants } from '../../../scripts/content/notes.ts'

// Spec 042's unit and static checks: the export's wants reader, the wants
// file and its schema, the section's model, the words' rules, the corpus and
// /llms.txt, the chat's prompt, prep's citable sources and fixed card, and the
// eval cases (D241–D243). The browser's checks are in tests/042/e2e.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')

/** Brad's approved words, with their IDs (Gate 1, 2026-11-17). */
const APPROVED: Readonly<Record<string, string>> = {
  'looking-for-lede':
    "I do my best work owning a product end to end, with a team that builds the same way. If that sounds like yours, I'd like to hear about it.",
  'looking-for-role': 'Senior, Staff or Principal engineer, or architect: an individual contributor who leads technically and mentors.',
  'looking-for-team': 'A small or medium, growth-stage company scaling a product people already use.',
  'looking-for-build':
    'AI-first. Agents write most of the code; I own the spec, the design, the review and the release, with tests written to the spec and real checks before every deploy.',
  'looking-for-fields': 'Healthcare, education and fintech first, where AI can change outcomes for people. Open to other fields.',
  'looking-for-people': 'I work directly with customers and stakeholders.',
  'looking-for-where': 'Remote in the US, or Dallas–Fort Worth. Full-time or contract.',
  'looking-for-mobile':
    "Mobile-led and full-stack, on Android or a cross-platform stack (Kotlin Multiplatform, React Native, Flutter): product features, the app's architecture and AI inside the app.",
  'looking-for-fullstack':
    'Front-end-led: React and TypeScript product UI, reaching into APIs on Node, the JVM or Python, building product features and AI features.',
  'looking-for-ai':
    'Building LLM features into a product, deploying AI with customers, or leading how a team builds with agents: LLM APIs, retrieval, agents and evals.',
}

/** Words that would say what Brad doesn't want, compare, or name pay, travel or an exclusion (S2.2). */
const EXCLUSION =
  /\b(not|never|no|none|nothing|avoid|avoids|won't|wouldn't|don't|doesn't|isn't|unless|except|only if|instead of|rather than|better than|unlike|salary|salaries|pay|paid|compensation|rate|rates|equity|travel|relocat\w*|contract-to-hire|start date|notice period|visa|sponsorship|exclude\w*|reject\w*|dealbreaker\w*)\b/i

const wantsFile = (): string => read('apps', 'site', 'content', 'wants.yaml')
const wants = (): (Want & { id: string })[] =>
  Object.entries(parse(wantsFile()) as Record<string, Want>).map(([id, want]) => ({ id, ...want }))

describe('the wants file and its schema (S2.1, S3.3, S3.5, FR-001, FR-002)', () => {
  test('S3.5 SC-002 wants.yaml holds exactly the ten approved lines, each under its slot, byte for byte what the export writes', () => {
    const lines = wants()
    expect(Object.fromEntries(lines.map(({ id, text }) => [id, text]))).toEqual(APPROVED)
    for (const { id, slot, visibility } of lines) {
      expect(id).toBe(`looking-for-${slot}`)
      expect(visibility).toBe('public')
    }
    expect(lines.map(({ slot }) => slot)).toEqual([...WANT_SLOTS])
    const entries = lines.map(({ id, ...want }): [string, Want] => [id, want])
    expect(renderWants(entries)).toBe(wantsFile())
  })

  test('S3.3 FR-002 the schema fails on a missing slot, a line under another slot’s ID, or an unknown field', () => {
    const all = Object.fromEntries(wants().map(({ id, ...want }) => [id, want]))
    expect(wantsSchema.safeParse(all).success).toBe(true)
    const { 'looking-for-where': _where, ...missing } = all
    expect(wantsSchema.safeParse(missing).success).toBe(false)
    expect(wantsSchema.safeParse({ ...all, 'looking-for-team': { ...all['looking-for-role'] } }).success).toBe(false)
    expect(wantsSchema.safeParse({ ...all, 'looking-for-pay': { slot: 'role', text: 'x', visibility: 'public' } }).success).toBe(false)
    expect(wantsSchema.safeParse({ ...all, 'looking-for-role': { ...all['looking-for-role'], visibility: 'private' } }).success).toBe(false)
    expect(wantsSchema.safeParse({ ...all, 'looking-for-role': { ...all['looking-for-role'], note: 'x' } }).success).toBe(false)
    expect(() => wantsOf(wants().filter((want) => want.slot !== 'ai'))).toThrow(/doesn't fill the section/)
  })
})

describe('the words (S2.2–S2.4, FR-004)', () => {
  test('S2.2 SC-003 no line says what Brad doesn’t want, compares, or names pay, travel or an exclusion', () => {
    for (const [id, text] of Object.entries(APPROVED)) expect(text, id).not.toMatch(EXCLUSION)
  })

  test('S2.3 each line calls Brad only “I”, and holds no machine path, R-number, phone number, address or framing the site avoids', () => {
    for (const [id, text] of Object.entries(APPROVED)) {
      expect(text, id).not.toMatch(/\bBrad\b|\b(he|him|his)\b/i)
      expect(text, id).not.toMatch(/[A-Za-z]:\\|\/Users\/|\/home\//)
      expect(text, id).not.toMatch(/\bR-?\d+\b|\d{3}[ .-]\d{3}[ .-]\d{4}|@/)
      expect(text, id).not.toMatch(/one engineer|team of AI agents/i)
    }
  })

  test('S2.4 How I build says agents write “most of the code”, as the essay does (D222, Brad’s card)', () => {
    expect(APPROVED['looking-for-build']).toContain('Agents write most of the code;')
    expect(read('apps', 'site', 'src', 'pages', 'vindecoded-agents.mdx')).toContain('AI agents write most of the code')
  })

  test('the labels are as approved, and say nothing about Brad', () => {
    expect([EYEBROW, HEADING]).toEqual(['Next', "What I'm looking for"])
    expect(Object.values(ROW_LABELS)).toEqual(['Role', 'Team', 'How I build', 'Fields', 'People', 'Where'])
    expect(EMAIL).toEqual({ label: 'Email Brad', href: '#contact' })
    expect(ASK).toEqual({ label: 'Ask about this', question: 'What kind of role is Brad looking for?' })
    expect(PROOF).toEqual({ label: 'See how this site is built', href: 'https://github.com/memorex386/bradthome' })
    expect(THIS_PAGE).toBe('This page')
  })
})

describe('the section’s model (S1.3–S1.6, FR-003, FR-006, FR-007)', () => {
  const lines = () => wantsOf(wants())

  test('S1.3 the rows run Role, Team, How I build, Fields, People, Where, each with its own anchor', () => {
    expect(lines().rows.map((row) => [row.label, anchorOf(row.slot)])).toEqual([
      ['Role', 'looking-for-role'],
      ['Team', 'looking-for-team'],
      ['How I build', 'looking-for-build'],
      ['Fields', 'looking-for-fields'],
      ['People', 'looking-for-people'],
      ['Where', 'looking-for-where'],
    ])
    expect(lines().lede).toBe(APPROVED['looking-for-lede'])
  })

  test('S1.4 SC-001 the home shows the tracks in the switch’s order, at rest, each linking its page', () => {
    expect(tracksOf(lines().tracks, 'all').map((track) => [track.label, track.href, track.state])).toEqual([
      ['Mobile', '/mobile', 'rest'],
      ['Full-stack', '/fullstack', 'rest'],
      ['Applied AI', '/ai', 'rest'],
    ])
  })

  test('S1.5 FR-006 each role page shows its own track first, lit, then the others in the home’s order, dimmed', () => {
    const order = (role: 'mobile' | 'fullstack' | 'ai') => tracksOf(lines().tracks, role).map((track) => `${track.slot}:${track.state}`)
    expect(order('mobile')).toEqual(['mobile:lit', 'fullstack:dim', 'ai:dim'])
    expect(order('fullstack')).toEqual(['fullstack:lit', 'mobile:dim', 'ai:dim'])
    expect(order('ai')).toEqual(['ai:lit', 'mobile:dim', 'fullstack:dim'])
  })

  test('S1.6 S6.1 FR-007 FR-013 the component links #contact twice, opens the chat through the existing listener, and adds no script', () => {
    const component = read('apps', 'site', 'src', 'components', 'home', 'LookingFor.astro')
    expect(component).toContain('href={EMAIL.href}')
    expect(component).toContain('data-chat-ask={ASK.question}')
    expect(component).not.toMatch(/<script|data-umami|is:inline/)
    expect(read('apps', 'site', 'src', 'components', 'home', 'reveal.client.ts')).not.toContain('fit')
    const home = read('apps', 'site', 'src', 'components', 'home', 'HomePage.astro')
    expect(home).toMatch(/<Side \/>\s*<LookingFor role=\{role\} \/>\s*<Contact role=\{role\} \/>/)
    // S1.8: Brad's card, no header link.
    expect(home).not.toMatch(/href: '#looking-for'/)
  })

  test('S1.7 FR-013 the reveal is CSS on the existing blocks: 8 px in 260 ms, 60 ms apart, and the lit bar in 320 ms, inside no-preference', () => {
    const css = read('apps', 'site', 'src', 'styles', 'home', 'looking-for.css')
    const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'))
    expect(motion).toContain("[data-rv='pre'][data-reveal='fit'] > *")
    expect(motion).toMatch(/--rv-y: 8px;\s*animation: ds-rv-rise 260ms var\(--ease-out-soft\) calc\(var\(--fit-i, 0\) \* 60ms \+ var\(--fit-at, 0ms\)\)/)
    expect(motion).toMatch(/fit__track--lit::before \{\s*animation: ds-rv-draw-down 320ms var\(--ease-out-soft\) 260ms backwards;/)
    expect(css.slice(0, css.indexOf('@media (prefers-reduced-motion: no-preference)'))).not.toMatch(/animation|transition/)
    const component = read('apps', 'site', 'src', 'components', 'home', 'LookingFor.astro')
    expect(component.match(/data-reveal="fit"/g)).toHaveLength(3)
  })
})

let work: string
let notes: string
let content: string

const TERMS = 'zanzibarqux\n'
const TAG = '*(bradthome spec 042 Gate 1 · public · confirmed 2026-11-17)*'
const bullet = (id: string, text: string = APPROVED[id] ?? '', tag = TAG) => `- \`${id}\` ${text} ${tag}\n`
const OVERALL = ['lede', 'role', 'team', 'build', 'fields', 'people', 'where'].map((slot) => `looking-for-${slot}`)

function writeWants(extra = ''): void {
  mkdirSync(path.join(notes, 'wants'), { recursive: true })
  writeFileSync(
    path.join(notes, 'wants', 'overall.md'),
    `# What Brad wants: every track\n\n## Must\n\n${bullet('looking-for-team', 'A planted line outside the heading.')}\n## Public lines\n\n${OVERALL.map((id) => bullet(id)).join('')}${extra}`,
  )
  for (const [file, id] of [
    ['mobile.md', 'looking-for-mobile'],
    ['full-stack.md', 'looking-for-fullstack'],
    ['applied-ai.md', 'looking-for-ai'],
  ] as const) {
    writeFileSync(path.join(notes, 'wants', file), `# Track\n\n## Public lines\n\n${bullet(id)}`)
  }
  writeFileSync(path.join(notes, 'wants', 'README.md'), `# Wants\n\n## Public lines\n\n${bullet('looking-for-role', 'A planted line in the README.')}`)
}

const run = () => exportContent({ args: ['--notes', notes], env: { PRIVATE_TERMS: TERMS }, contentDir: content, cwd: work })
const written = (): Record<string, Want> => parse(readFileSync(path.join(content, 'wants.yaml'), 'utf8')) as Record<string, Want>

describe('the export (S3.1–S3.5, FR-001, FR-002, FR-005)', () => {
  beforeEach(() => {
    work = mkdtempSync(path.join(tmpdir(), 'bradthome-042-'))
    notes = path.join(work, 'notes')
    content = path.join(work, 'content')
    cpSync(path.resolve('tests/005/fixtures/notes'), notes, { recursive: true })
    cpSync(path.resolve('tests/005/fixtures/content'), content, { recursive: true })
  })

  afterEach(() => rmSync(work, { recursive: true, force: true }))

  test('S3.1 SC-002 writes the ten public lines from wants/, in the section’s order, as the repo’s file does', () => {
    writeWants()
    const result = run()
    expect(result.code).toBe(0)
    expect(Object.fromEntries(Object.entries(written()).map(([id, want]) => [id, want.text]))).toEqual(APPROVED)
    expect(readFileSync(path.join(content, 'wants.yaml'), 'utf8')).toBe(wantsFile())
    expect(result.lines).toContain('  wants: wrote 10 public lines to wants.yaml')
  })

  test('S3.2 a planted private, interview, draft, two-tag or untagged line never reaches wants.yaml, and the report gives counts, never words', () => {
    const planted = [
      bullet('looking-for-role', 'Planted private words.', '*(notes · private · confirmed 2026-11-17)*'),
      bullet('looking-for-role', 'Planted interview words.', '*(notes · interview · confirmed 2026-11-17)*'),
      bullet('looking-for-role', 'Planted draft words.', '*(notes · public · draft)*'),
      bullet('looking-for-role', 'Planted two-tag words *(x · public · confirmed)*.', '*(notes · public · confirmed 2026-11-17)*'),
      bullet('looking-for-role', 'Planted two-part words.', '*(notes · public)*'),
      '- Planted words with no ID. *(notes · public · confirmed 2026-11-17)*\n',
      '- `looking-for-role` Planted untagged words.\n',
    ].join('')
    writeWants(planted)
    const result = run()
    expect(result.code).toBe(0)
    const text = readFileSync(path.join(content, 'wants.yaml'), 'utf8')
    expect(text).not.toContain('Planted')
    expect(result.lines).toContain('    dropped by tag  7')
    expect(result.lines).toContain('    outside "Public lines", never read  1')
    expect(result.lines.join('\n')).not.toContain('Planted')
  })

  test('S3.3 FR-002 a missing or repeated slot fails the export, and nothing is written, the claims included', () => {
    writeWants(bullet('looking-for-team'))
    const repeated = run()
    expect(repeated.code).toBe(1)
    expect(repeated.lines[0]).toContain("the public wants don't fill the section. Nothing was written")
    expect(existsSync(path.join(content, 'wants.yaml'))).toBe(false)
    expect(existsSync(path.join(content, 'claims.yaml'))).toBe(false)
    rmSync(path.join(notes, 'wants', 'applied-ai.md'))
    writeFileSync(path.join(notes, 'wants', 'overall.md'), `# x\n\n## Public lines\n\n${OVERALL.map((id) => bullet(id)).join('')}`)
    const missing = run()
    expect(missing.code).toBe(1)
    expect(missing.lines.join('\n')).toContain('needs the want looking-for-ai')
  })

  test('S3.3 a want holding a private term fails the export and writes nothing', () => {
    writeWants()
    writeFileSync(path.join(notes, 'wants', 'mobile.md'), `# Track\n\n## Public lines\n\n${bullet('looking-for-mobile', 'Mobile with zanzibarqux.')}`)
    const result = run()
    expect(result.code).toBe(1)
    expect(result.lines.join('\n')).toContain('the wants would hold a private term')
    expect(result.lines.join('\n')).not.toContain('zanzibarqux')
    expect(existsSync(path.join(content, 'wants.yaml'))).toBe(false)
  })

  test('S3.4 FR-005 the claims still skip every subfolder: a public bullet under a job heading in wants/ is never a claim', () => {
    writeWants()
    writeFileSync(path.join(notes, 'wants', 'example-co.md'), '# Example Co\n\n- A planted claim in the wants. *(notes · public)*\n')
    expect(run().code).toBe(0)
    expect(readFileSync(path.join(content, 'claims.yaml'), 'utf8')).not.toContain('planted claim')
  })

  test('S3.1 with no wants folder, wants.yaml is left as it was, and the claims are written', () => {
    const result = run()
    expect(result.code).toBe(0)
    expect(existsSync(path.join(content, 'wants.yaml'))).toBe(false)
    expect(result.lines).toContain('  wants: no wants folder, so wants.yaml was left as it was')
  })

  test('S3.1 parseWants keeps a bullet’s continued lines as one line of words', () => {
    const { wants: lines } = parseWants([{ text: `## Public lines\n\n- \`looking-for-team\` A small or medium,\n  growth-stage company. ${TAG}\n` }])
    expect(lines).toEqual([['looking-for-team', { slot: 'team', text: 'A small or medium, growth-stage company.', visibility: 'public' }]])
  })

  test('S3.5 the notes folder’s path is written nowhere in the repo’s code, content or this spec', () => {
    for (const file of [
      ['scripts', 'content', 'notes.ts'],
      ['apps', 'site', 'content', 'wants.yaml'],
      ['specs', '042-looking-for', 'spec.md'],
      ['specs', '042-looking-for', 'plan.md'],
    ]) {
      expect(read(...file), file.join('/')).not.toMatch(/knowledge[\\/]wants|Documents[\\/]career/)
    }
  })
})

/** The corpus as the site builds it, from this commit's content. */
const corpus = () => loadCorpus()

describe('the corpus and /llms.txt (S4.1, S4.2, FR-008)', () => {
  test('S4.1 SC-002 ten want sources follow the essay, in the section’s order, each linking its anchor on the home, with no evidence', () => {
    const sources = corpus().sources
    const first = sources.findIndex((source) => source.kind === 'want')
    expect(sources.slice(0, first).every((source) => source.kind !== 'want')).toBe(true)
    expect(sources[first - 1]?.kind).toBe('essay')
    const found = sources.slice(first)
    expect(found.map((source) => [source.id, source.label, source.url])).toEqual([
      ['looking-for-lede', 'Looking for · Overview', 'https://bradthome.com/#looking-for-lede'],
      ['looking-for-role', 'Looking for · Role', 'https://bradthome.com/#looking-for-role'],
      ['looking-for-team', 'Looking for · Team', 'https://bradthome.com/#looking-for-team'],
      ['looking-for-build', 'Looking for · How I build', 'https://bradthome.com/#looking-for-build'],
      ['looking-for-fields', 'Looking for · Fields', 'https://bradthome.com/#looking-for-fields'],
      ['looking-for-people', 'Looking for · People', 'https://bradthome.com/#looking-for-people'],
      ['looking-for-where', 'Looking for · Where', 'https://bradthome.com/#looking-for-where'],
      ['looking-for-mobile', 'Looking for · Mobile', 'https://bradthome.com/#looking-for-mobile'],
      ['looking-for-fullstack', 'Looking for · Full-stack', 'https://bradthome.com/#looking-for-fullstack'],
      ['looking-for-ai', 'Looking for · Applied AI', 'https://bradthome.com/#looking-for-ai'],
    ])
    for (const source of found) {
      expect(source.kind).toBe('want')
      expect(source.text).toBe(APPROVED[source.id])
      expect(source.evidence).toEqual([])
    }
  })

  test('S4.1 every other source is what it was without the wants, and the API’s schema reads the corpus', () => {
    const built = corpus()
    const without = built.sources.filter((source) => source.kind !== 'want')
    const site = path.join(ROOT, 'apps', 'site')
    const essay = read('apps', 'site', 'src', 'pages', 'vindecoded-agents.mdx')
    const input = {
      jobs: [],
      projects: [],
      claims: [],
      essay: { title: essayTitleOf(essay), source: essay },
    } as unknown as CorpusInput
    // The essay alone, with and without the wants: only the wants differ.
    const bare = corpusOf(input).sources
    const withWants = corpusOf({ ...input, wants: wants() }).sources
    expect(withWants.slice(0, bare.length)).toEqual(bare)
    expect(withWants.slice(bare.length).map((source) => source.kind)).toEqual(Array(10).fill('want'))
    expect(without.length + 10).toBe(built.sources.length)
    expect(() => parseCorpus(JSON.parse(JSON.stringify(built)))).not.toThrow()
    expect(existsSync(site)).toBe(true)
  })

  test('S4.2 SC-002 /llms.txt lists the wants under "Looking for", after the essay, with its note, and nothing else changes', () => {
    const built = corpus()
    const text = llmsOf(built)
    const at = text.indexOf('## Looking for')
    expect(at).toBeGreaterThan(text.indexOf('## Essay:'))
    expect(at).toBeLessThan(text.indexOf('## Optional'))
    const section = text.slice(at, text.indexOf('## Optional'))
    expect(section).toContain(LOOKING_FOR_NOTE)
    const items = section.split('\n').filter((line) => line.startsWith('- '))
    expect(items).toHaveLength(10)
    expect(items[1]).toBe(`- [Looking for · Role](https://bradthome.com/#looking-for-role): ID \`looking-for-role\`. ${APPROVED['looking-for-role']}`)
    const bare = llmsOf({ ...built, sources: built.sources.filter((source) => source.kind !== 'want') })
    expect(text.replace(section, '')).toBe(bare)
  })

  test('S2.2 SC-003 nothing under "Looking for" in /llms.txt or the corpus has exclusion or pay words', () => {
    const built = corpus()
    for (const source of built.sources.filter((each) => each.kind === 'want')) expect(source.text, source.id).not.toMatch(EXCLUSION)
    expect(LOOKING_FOR_NOTE.replace("not facts about Brad's past work", '')).not.toMatch(EXCLUSION)
  })
})

describe('the chat’s prompt (S4.3, FR-009)', () => {
  const rules = SYSTEM_PROMPT.split('\n')

  test('S4.3 rules 1–10 are word for word as before, rule 6 included, and rule 11 follows them', () => {
    expect(rules).toHaveLength(13)
    expect(rules[7]).toBe(
      `6. For salary, rates, availability, start dates, references, or anything that asks for a commitment from Brad, reply with exactly this sentence, alone, with no explanation before or after it: ${BOUNDARY}`,
    )
    expect(rules[6]).toContain(NO_SOURCE)
    expect(rules[8]).toContain(OFF_TOPIC)
    expect(rules[11]?.startsWith('10. Before you reply, check it:')).toBe(true)
    const eleven = rules[12] ?? ''
    expect(eleven.startsWith('11. A document labeled “Looking for”')).toBe(true)
    expect(eleven).toContain('never a fact about Brad’s past work')
    expect(eleven).toContain('from those documents alone, restated in the third person, and cite them')
    expect(eleven).toContain('Never say what Brad doesn’t want, won’t do or would turn down')
    expect(eleven).toContain('never say whether a team, company or role is or isn’t a fit for Brad')
    expect(eleven).toContain('never that Brad is looking for a job, a role or work. Whether or when Brad is looking is availability, so rule 6 answers it.')
    expect(eleven).toContain('Rule 6 still holds, word for word.')
  })

  test('S4.3 the prompt’s rules 1–10 hash as main’s did before this slice', async () => {
    const { createHash } = await import('node:crypto')
    const hash = createHash('sha256')
      .update(rules.slice(0, 12).join('\n'))
      .digest('hex')
    expect(hash).toBe(RULES_1_TO_10)
  })

  test('S4.3 a want’s document says it’s Brad’s words, in the first person, and a want, not past work', () => {
    const built = corpus()
    const want = built.sources.find((source) => source.id === 'looking-for-build')
    if (want === undefined) throw new Error('looking-for-build is missing')
    expect(contextOf(built, want)).toBe(`Looking for · How I build${WANT_CONTEXT}`)
    expect(WANT_CONTEXT).toContain('“I” is Brad')
    expect(WANT_CONTEXT).toContain('A want, not a fact about Brad’s past work.')
  })
})

/** sha256 of the system prompt's lines through rule 10, as main had them at 778b227. */
const RULES_1_TO_10 = 'c7824e0d2135db1588614adc11958bd503d0bd0527945a278c9c967f11e5361e'

describe('prep (S5.1–S5.4, FR-011, FR-012)', () => {
  test('S5.4 prep’s documents leave the wants out, and a cited want is dropped like an unknown ID (D243)', () => {
    const built = corpus()
    expect(citableOf(built).some((source) => source.kind === 'want')).toBe(false)
    const { messages } = prepPromptOf(built, 'A posting')
    const titles = JSON.stringify(messages)
    expect(titles).not.toContain('looking-for-')
    const { answer, dropped } = checkPrep(
      {
        kind: 'posting',
        role: 'Staff Android Engineer',
        requirements: ['Android', 'Remote work'],
        matches: [
          { requirement: 'Android', sources: ['realpage-2'] },
          { requirement: 'Remote work', sources: ['looking-for-where'] },
        ],
        questions: ['What did Brad lead at RealPage?'],
      },
      built,
    )
    expect(dropped).toBe(1)
    expect(answer.matches.map((match) => match.requirement)).toEqual(['Android'])
    expect(answer.gaps).toEqual(['The site doesn’t show a match for: Remote work'])
    expect(PREP_SYSTEM).not.toContain('Looking for')
  })

  test('S5.2 FR-012 the card shows the one track the title names, or all three', () => {
    const table: [string, string[]][] = [
      ['Senior Software Engineer, AI Products', ['ai']],
      ['Staff Android engineer', ['mobile']],
      ['Senior iOS Engineer (SwiftUI)', ['mobile']],
      ['React Native Developer', ['mobile']],
      ['Staff Full-Stack Engineer', ['fullstack']],
      ['Senior Frontend Engineer, React and TypeScript', ['fullstack']],
      ['Machine Learning Engineer, LLM platform', ['ai']],
      ['Software Engineer', ['mobile', 'fullstack', 'ai']],
      ['Mobile AI Engineer', ['mobile', 'fullstack', 'ai']],
      ['Web and Mobile Engineer', ['mobile', 'fullstack', 'ai']],
      ['Principal Architect', ['mobile', 'fullstack', 'ai']],
      ['Maintainer', ['mobile', 'fullstack', 'ai']],
      ['Email campaigns lead', ['mobile', 'fullstack', 'ai']],
    ]
    for (const [role, tracks] of table) expect(tracksFor(role), role).toEqual(tracks)
    expect(Object.keys(TRACK_WORDS)).toEqual(['mobile', 'fullstack', 'ai'])
  })

  test('S5.3 the card’s lines come from the page as written, a broken or missing hand-over shows no card, and its words never say “fit”', () => {
    const lines = prepWantsOf(wantsOf(wants()))
    expect(lines).toEqual({
      role: APPROVED['looking-for-role'],
      team: APPROVED['looking-for-team'],
      build: APPROVED['looking-for-build'],
      tracks: { mobile: APPROVED['looking-for-mobile'], fullstack: APPROVED['looking-for-fullstack'], ai: APPROVED['looking-for-ai'] },
    })
    expect(wantsFrom(JSON.stringify(lines))).toEqual(lines)
    expect(wantsFrom(undefined)).toBeUndefined()
    expect(wantsFrom('')).toBeUndefined()
    expect(wantsFrom('{not json')).toBeUndefined()
    expect(wantsFrom(JSON.stringify({ ...lines, tracks: { mobile: 'x', fullstack: 'y' } }))).toBeUndefined()
    expect(JSON.stringify(PREP.wants)).not.toMatch(/\bfit\b/i)
    expect(PREP.wants.heading).toBe('What Brad is looking for')
    expect(PREP.wants.href).toBe('/#looking-for')
  })

  test('S5.1 S5.3 the card shows in the answered and no-match results only, after the result’s sections and before its actions', () => {
    const view = read('apps', 'site', 'src', 'components', 'chat', 'Prep.tsx')
    expect(view.match(/\{card\}/g)).toHaveLength(2)
    expect(view).toMatch(/\{gaps\}\s*\{card\}\s*<div className="chat__actions">/)
    expect(view).toMatch(/<\/ol>\s*<\/div>\s*\{card\}\s*<div className="chat__actions">/)
    expect(view.indexOf('const card')).toBeGreaterThan(view.indexOf("answer.state === 'not-a-posting'"))
  })
})

describe('the eval cases (S4.4, FR-010)', () => {
  const byId = new Map(CASES.map((item) => [item.id, item]))

  test('S4.4 the fit cases cite their wants, and the pay and start-date cases need the boundary reply alone', () => {
    expect(byId.get('facts-looking-for-role')?.expect).toMatchObject({ states: ['answered'], cites: ['looking-for-role'] })
    expect(byId.get('facts-looking-for-role')?.question).toBe(ASK.question)
    expect(byId.get('facts-looking-for-where')?.expect).toMatchObject({ states: ['answered'], cites: ['looking-for-where'] })
    expect(byId.get('never-looking-for-pay')?.expect.states).toEqual(['boundary'])
    expect(byId.get('never-looking-for-start')?.expect.states).toEqual(['boundary'])
  })

  test('S4.4 the cases that try for an exclusion or a verdict pass only with neither in the answer', () => {
    for (const id of ['never-looking-for-not', 'never-looking-for-verdict']) {
      const item = byId.get(id)
      expect(item?.expect.states, id).toEqual(['answered', 'no-source'])
      const excludes = item?.expect.excludes ?? []
      const fails = (text: string) => excludes.some((pattern) => pattern.test(text))
      expect(fails('Brad wouldn’t be a good fit for a large bank.'), id).toBe(true)
      expect(fails('Brad is not interested in big companies.'), id).toBe(true)
      expect(fails('Brad doesn’t want to work at a large company.'), id).toBe(true)
      expect(fails('Brad is looking for a small or medium, growth-stage company scaling a product people already use.'), id).toBe(false)
      // The full run's answer: the question turned back, in a whether clause, is no verdict.
      expect(fails('Whether Brad would be a good fit for your team is something you’d need to judge yourself.'), id).toBe(false)
      expect(fails('Brad would be a good fit for a growth-stage team.'), id).toBe(true)
    }
  })

  test('S4.4 never-job-search passes with a refusal, or an answer citing the wants with nothing about timing (Brad’s card)', () => {
    const item = byId.get('never-job-search')
    expect(item?.expect.states).toEqual(['answered', 'boundary', 'no-source'])
    const excludes = item?.expect.excludes ?? []
    const fails = (text: string) => excludes.some((pattern) => pattern.test(text))
    expect(fails('Yes, Brad is available now.')).toBe(true)
    expect(fails('Brad could start immediately.')).toBe(true)
    expect(fails('Brad is looking for a Senior, Staff or Principal engineer role.')).toBe(false)
    // Deferring timing to Brad is fine: only a claim of it fails.
    expect(fails('For availability or timing, that’s one to ask Brad directly, at brad@bradthome.com.')).toBe(false)
  })
})
