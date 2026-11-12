import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { type CorpusInput, corpusOf, corpusSchema, factOf, jsonOf, llmsOf, SITE_NOTES } from '../../../apps/site/src/corpus/corpus.ts'
import { anchorOf, ESSAY_SECTIONS, essayTitleOf, sectionsOf } from '../../../apps/site/src/corpus/essay.ts'

// Spec 020, the corpus: corpusOf over the real content, read with plain Node
// as the build reads it, and over copies with one planted fault each.

const SITE = path.resolve('apps/site')
const CONTENT = path.join(SITE, 'content')
const ESSAY = readFileSync(path.join(SITE, 'src', 'pages', 'vindecoded-agents.mdx'), 'utf8')

const folder = (name: string) =>
  readdirSync(path.join(CONTENT, name))
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => ({ id: file.slice(0, -'.yaml'.length), ...(parse(readFileSync(path.join(CONTENT, name, file), 'utf8')) as object) }))

function input(): CorpusInput {
  const claims = Object.entries(parse(readFileSync(path.join(CONTENT, 'claims.yaml'), 'utf8')) as Record<string, object>).map(
    ([id, claim]) => ({ id, ...claim }),
  )
  return {
    jobs: folder('jobs'),
    projects: folder('projects'),
    // Spec 036: the career's own facts, such as the years of each kind of work, are a subject too (D224).
    career: folder('career'),
    claims,
    essay: { title: essayTitleOf(ESSAY), source: ESSAY },
  } as unknown as CorpusInput
}

const withClaim = (id: string, change: Record<string, unknown>): CorpusInput => {
  const base = input()
  return { ...base, claims: base.claims.map((claim) => (claim.id === id ? { ...claim, ...change } : claim)) }
}

/** The IDs this slice ships (S3.3). Removing one is a change to this list, on purpose. */
const SHIPPED = [
  'job-hopper', 'job-bleacher-report', 'job-realpage', 'job-bookshout', 'job-bottle-rocket', 'job-enterprise-it',
  'project-sudoku-world', 'project-vindecoded',
  'bleacher-report-1', 'bleacher-report-2', 'bleacher-report-3', 'bookshout-1', 'bookshout-2', 'bookshout-3',
  'bottle-rocket-1', 'bottle-rocket-2', 'bottle-rocket-3', 'bottle-rocket-4', 'education-1',
  'enterprise-it-1', 'enterprise-it-2', 'enterprise-it-3',
  'hopper-role-and-dates-1', 'hopper-role-and-dates-2', 'hopper-disruption-assistance-1', 'hopper-disruption-assistance-2',
  'hopper-disruption-assistance-3', 'hopper-partner-platform-1', 'hopper-partner-platform-2', 'hopper-partner-platform-3',
  'hopper-fintech-ai-1', 'hopper-agent-and-experimentation-workflow-1', 'hopper-mobile-remoteui-and-webviews-1',
  'hopper-mobile-remoteui-and-webviews-2', 'hopper-stack-1', 'realpage-1', 'realpage-2',
  'sudoku-world-1', 'sudoku-world-2', 'sudoku-world-3',
  'vindecoded-1', 'vindecoded-2', 'vindecoded-3', 'vindecoded-4', 'vindecoded-5', 'vindecoded-6', 'vindecoded-7',
  ...Object.keys(ESSAY_SECTIONS),
]

describe('only public facts get in', () => {
  test('S1.1 FR-001 every public claim is one source, under its own ID, beside the jobs, projects and essay sections', () => {
    const base = input()
    const corpus = corpusOf(base)
    const claims = corpus.sources.filter((source) => source.kind === 'claim')
    expect(claims.map((source) => source.id).sort()).toEqual(base.claims.map((claim) => claim.id).sort())
    expect(corpus.sources.filter((source) => source.kind === 'job')).toHaveLength(base.jobs.length)
    expect(corpus.sources.filter((source) => source.kind === 'project')).toHaveLength(base.projects.length)
    expect(corpus.sources.filter((source) => source.kind === 'essay')).toHaveLength(Object.keys(ESSAY_SECTIONS).length)
  })

  test('S1.2 FR-002 SC-002 corpusOf throws on a claim marked interview, private or nothing', () => {
    for (const visibility of ['interview', 'private', undefined])
      expect(() => corpusOf(withClaim('hopper-stack-1', { visibility })), String(visibility)).toThrow(/public claims only, and hopper-stack-1/)
  })

  test('S1.2 FR-002 corpusOf throws on a claim that fails the schema, such as an unknown field', () => {
    expect(() => corpusOf(withClaim('hopper-stack-1', { source: 'notes' }))).toThrow(/public claims only/)
  })

  test('S1.3 FR-003 the notes to the site are cut, and the words before them stay', () => {
    const corpus = corpusOf(input())
    const json = jsonOf(corpus)
    const llms = llmsOf(corpus)
    for (const note of Object.values(SITE_NOTES)) {
      expect(json).not.toContain(note)
      expect(llms).not.toContain(note)
    }
    const text = (id: string) => corpus.sources.find((source) => source.id === id)?.text
    expect(text('bookshout-1')).toBe('Senior Mobile Engineer.')
    expect(text('realpage-1')).toBe('Lead Android Developer.')
    expect(text('vindecoded-7')).toMatch(/^The case study's counts, measured on 10\/28:\n[\s\S]*- 46 ADRs$/)
  })

  test('S1.4 FR-003 SC-002 a listed claim that no longer ends with its note fails the build', () => {
    expect(() => corpusOf(withClaim('realpage-1', { text: 'Lead Android Developer. The site shows one line.' }))).toThrow(
      /realpage-1 no longer ends with its note/,
    )
    expect(() => factOf('vindecoded-7', 'The counts.')).toThrow(/no longer ends with its note/)
  })

  test('S1.5 FR-003 SC-002 an unlisted claim that reads like a note fails the build', () => {
    for (const sentence of ['The site shows only the title.', 'Never say it was the first.', "Don't show the dates."]) {
      expect(() => corpusOf(withClaim('bottle-rocket-1', { text: `Android Developer. ${sentence}` })), sentence).toThrow(
        /bottle-rocket-1 reads like a note to the site/,
      )
    }
  })

  test('S1.5 FR-003 a second note beside a listed one fails the build too', () => {
    const text = 'Lead Android Developer. Never say it was the first. The site shows only this dated line.'
    expect(() => corpusOf(withClaim('realpage-1', { text }))).toThrow(/realpage-1 reads like a note to the site/)
  })
})

describe('every source links to where it shows', () => {
  test('S2.2 FR-005 a claim with a receipt on the home links it, and every other source links its place', () => {
    const url = (id: string) => corpusOf(input()).sources.find((source) => source.id === id)?.url.replace('https://bradthome.com', '')
    expect(url('hopper-disruption-assistance-1')).toBe('/#receipt-hopper-disruption-assistance-1')
    expect(url('vindecoded-7')).toBe('/#receipt-vindecoded-7')
    expect(url('hopper-stack-1')).toBe('/#hopper')
    expect(url('bookshout-1')).toBe('/#experience-bookshout')
    expect(url('education-1')).toBe('/#experience-education')
    expect(url('vindecoded-4')).toBe('/#side-vindecoded')
    expect(url('job-hopper')).toBe('/#hopper')
    expect(url('job-realpage')).toBe('/#experience-realpage')
    expect(url('project-sudoku-world')).toBe('/#side-sudoku-world')
  })

  test('S2.3 FR-009 each essay section links its heading anchor on the essay', () => {
    const essay = corpusOf(input()).sources.filter((source) => source.kind === 'essay')
    for (const source of essay) {
      const heading = ESSAY_SECTIONS[source.id] ?? ''
      expect(source.url).toBe(`https://bradthome.com/vindecoded-agents#${anchorOf(heading)}`)
      expect(source.label).toBe(`Essay · ${heading}`)
    }
    expect(anchorOf("What I'd tell a team adopting this")).toBe('what-id-tell-a-team-adopting-this')
    expect(anchorOf('One agent, one worktree, one port slot')).toBe('one-agent-one-worktree-one-port-slot')
  })

  test('FR-009 the essay goes in as words: no front matter, imports, exports or components, and its author is Brad', () => {
    const corpus = corpusOf(input())
    const essay = corpus.sources.filter((source) => source.kind === 'essay').map((source) => source.text).join('\n')
    expect(essay).not.toMatch(/^(import|export) /m)
    expect(essay).not.toMatch(/<SystemDiagram/)
    expect(essay).not.toMatch(/^layout:/m)
    expect(corpus.essay.author).toBe('Brad Thome')
    expect(llmsOf(corpus)).toContain(`The essay is Brad's own, in the first person, so its "I" is Brad.`)
  })
})

describe('IDs stay the same', () => {
  test('S3.1 FR-004 rewording a claim or an essay section keeps every ID', () => {
    const before = corpusOf(input()).sources.map((source) => source.id)
    const base = withClaim('hopper-fintech-ai-1', { text: 'Reworded entirely, with new words.' })
    const essay = base.essay.source.replace('The agents are not the interesting part.', 'The agents matter less than the system.')
    const after = corpusOf({ ...base, essay: { ...base.essay, source: essay } })
    expect(after.sources.map((source) => source.id)).toEqual(before)
    expect(after.sources.find((source) => source.id === 'hopper-fintech-ai-1')?.text).toBe('Reworded entirely, with new words.')
  })

  test('S3.2 FR-004 SC-002 a renamed heading keeps its ID with its entry, and fails without one', () => {
    const renamed = ESSAY.replace('## New features ship dark', '## Every feature ships dark')
    expect(() => sectionsOf(renamed)).toThrow(/"Every feature ships dark" has no ID/)
    const table = ESSAY_SECTIONS as Record<string, string>
    const old = table['essay-dark-launch'] ?? ''
    table['essay-dark-launch'] = 'Every feature ships dark'
    try {
      const section = sectionsOf(renamed).find((item) => item.id === 'essay-dark-launch')
      expect(section?.anchor).toBe('every-feature-ships-dark')
    } finally {
      table['essay-dark-launch'] = old
    }
    expect(() => sectionsOf(ESSAY.replace(/## Closing the loop[\s\S]*?(?=## What broke)/, ''))).toThrow(/names "Closing the loop"/)
  })

  test('S3.3 FR-004 every ID this slice shipped is still in the corpus', () => {
    const ids = new Set(corpusOf(input()).sources.map((source) => source.id))
    expect(SHIPPED.filter((id) => !ids.has(id))).toEqual([])
  })

  test('S3.4 FR-004 every ID is unique, lowercase words joined by hyphens', () => {
    const ids = corpusOf(input()).sources.map((source) => source.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })
})

describe('both files validate', () => {
  test('S4.1 FR-006 corpus.json parses against the strict shape, at version 1', () => {
    const json = jsonOf(corpusOf(input()))
    expect(json.endsWith('}\n')).toBe(true)
    const parsed = corpusSchema.safeParse(JSON.parse(json))
    expect(parsed.error?.issues ?? []).toEqual([])
  })

  test("S4.2 FR-007 llms.txt follows llmstxt.org's format", () => {
    const lines = llmsOf(corpusOf(input())).split('\n')
    expect(lines[0]).toBe('# Brad Thome')
    expect(lines[1]).toBe('')
    expect(lines[2]).toMatch(/^> \S/)
    expect(lines.filter((line) => line.startsWith('#'))).toEqual([
      '# Brad Thome',
      '## Résumé',
      '## Essay: Running a 1.4M-download product with AI agents',
      '## Optional',
    ])
    const firstH2 = lines.indexOf('## Résumé')
    for (const line of lines.slice(3, firstH2)) expect(line).not.toMatch(/^#|^- /)
    const items = lines.slice(firstH2).filter((line) => line !== '' && !line.startsWith('## '))
    for (const line of items) expect(line).toMatch(/^- \[[^\]]+\]\(https:\/\/bradthome\.com\/[^)\s]*\): \S/)
  })

  test('S4.3 FR-007 both files hold the same sources in the same order, each item on one line', () => {
    const corpus = corpusOf(input())
    const items = llmsOf(corpus)
      .split('\n')
      .filter((line) => /^- \[.+\]\(.+\): ID `/.test(line))
    expect(items).toHaveLength(corpus.sources.length)
    corpus.sources.forEach((source, index) => {
      const item = items[index] ?? ''
      expect(item).toContain(`](${source.url}): ID \`${source.id}\`. `)
      expect(item).toContain(`[${source.label}]`)
      expect(item.endsWith(source.text.replace(/\s*\n\s*/g, ' ').trim())).toBe(true)
    })
  })
})

describe('size', () => {
  test('S5.2 SC-003 the corpus is under 15,000 estimated tokens, its characters over 4', () => {
    const corpus = corpusOf(input())
    const tokens = Math.round(jsonOf(corpus).length / 4)
    console.log(`corpus.json is about ${tokens} tokens, llms.txt about ${Math.round(llmsOf(corpus).length / 4)}`)
    expect(tokens).toBeLessThan(15_000)
  })
})
