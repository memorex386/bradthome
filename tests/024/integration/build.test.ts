import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { parse } from 'yaml'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { MAX_POSTING_WORDS, PREP_QUESTIONS, QUESTIONS_PER_DAY } from '../../../apps/chat-api/src/constants.ts'
import { wordsOf } from '../../../apps/chat-api/src/prep-shape.ts'
import { EXAMPLE_POSTING } from '../../../apps/site/src/components/chat/example.ts'
import { HELD_PREP, PREP_ANSWER } from '../../../apps/site/src/components/chat/prep-fixtures.ts'
import { PREP } from '../../../apps/site/src/components/chat/words.ts'

// Spec 024 in real builds: the one previews and next serve, with prep, and
// the release workflow's, without it until v2.2 (S9.1, D190). The gallery's
// held prep states are the real window drawn on the server, so their markup
// is checked here (FR-005). It builds into the checkout's ignored
// node_modules/.cache, as spec 022's test does.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const SITE = path.join(ROOT, 'apps', 'site')

interface Build {
  out: string
  files: string[]
  read(name: string): string
}

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? filesIn(full) : [full]
  })
}

function build(release: boolean): Build {
  const cache = path.join(ROOT, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  const out = mkdtempSync(path.join(cache, `bradthome-024-${release ? 'release' : 'next'}-`))
  const astro = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')
  const env = { ...process.env, CI: '', BRADTHOME_RELEASE: release ? '1' : '' }
  const result = spawnSync(process.execPath, [astro, 'build', '--outDir', out], { cwd: SITE, encoding: 'utf8', env })
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`)
  const files = filesIn(out).map((file) => path.relative(out, file).replaceAll('\\', '/'))
  return { out, files, read: (name) => readFileSync(path.join(out, name), 'utf8') }
}

const gz = (text: string) => gzipSync(text).length
const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')

/** The window's chunk and every chunk it imports, gzipped. */
function onOpen(b: Build): number {
  const mount = b.files.find((file) => /^_astro\/mount\.[\w-]+\.js$/.test(file))
  if (mount === undefined) throw new Error('no window chunk')
  const seen = new Set<string>()
  const visit = (name: string) => {
    if (seen.has(name)) return
    seen.add(name)
    for (const match of b.read(name).matchAll(/from\s*["'`]\.\/([\w.-]+\.js)["'`]/g)) visit(`_astro/${match[1]}`)
  }
  visit(mount)
  return [...seen].filter((name) => !/PreviewLink\.astro_astro_type_script/.test(name)).reduce((sum, name) => sum + gz(b.read(name)), 0)
}

let next: Build
let release: Build
let held: Map<string, string>

beforeAll(() => {
  next = build(false)
  release = build(true)
  const gallery = next.read('design-system.html')
  // Each held state runs from its item's id to the next one's, or the section's end.
  const starts = HELD_PREP.map((state) => gallery.indexOf(`id="prep-${state.id.toLowerCase()}"`))
  if (starts.some((start) => start < 0)) throw new Error('a held prep state is missing')
  const end = gallery.indexOf('</section>', starts.at(-1))
  held = new Map(HELD_PREP.map((state, index) => [state.id, gallery.slice(starts[index], starts[index + 1] ?? end)]))
})

afterAll(() => {
  for (const b of [next, release]) if (b !== undefined) rmSync(b.out, { recursive: true, force: true })
})

const draw = (id: string) => held.get(id) ?? ''

describe('the held states, drawn on the server (FR-005)', () => {
  test('S1.1 FR-012 every prep state has the Mode switch with Interview prep pressed, and calls Brad Brad', () => {
    for (const state of HELD_PREP) {
      const html = draw(state.id)
      expect(html, state.id).toMatch(/role="group" aria-label="Mode"/)
      expect(html, state.id).toMatch(/aria-pressed="true"[^>]*>Interview prep</)
      expect(textOf(html), state.id).not.toMatch(/\b(?:he|him|his)\b/i)
    }
  })

  test('S2.1 S2.5 P1 has the intro, the labelled box with its count, the button and the note', () => {
    const text = textOf(draw('P1'))
    for (const words of [PREP.intro, PREP.label, PREP.count(wordsOf(EXAMPLE_POSTING)), PREP.map, PREP.note])
      expect(text).toContain(textOf(words))
    expect(draw('P1')).toMatch(/aria-describedby="[^"]+"/)
  })

  test(`S2.3 P5 a posting over ${MAX_POSTING_WORDS} words says so and turns the button off`, () => {
    const html = draw('P5')
    expect(textOf(html)).toMatch(/That’s [\d,]+ words\. Prep reads up to 3,000/)
    expect(html).toMatch(/aria-invalid="true"/)
    expect(html).toMatch(/aria-disabled="true"[^>]*>Map Brad to this role/)
  })

  test('S3.1 S3.2 P2 shows the count and the four steps, the second working with its bar', () => {
    const html = draw('P2')
    expect(textOf(html)).toContain(PREP.posting(wordsOf(EXAMPLE_POSTING)))
    expect(html.match(/data-step="done"/g)).toHaveLength(1)
    expect(html.match(/data-step="active"/g)).toHaveLength(1)
    expect(html.match(/data-step="waiting"/g)).toHaveLength(2)
    expect(textOf(html)).toContain('Matching evidence, 4 of 8')
    expect(html).toMatch(/data-share="5"/)
  })

  test('S4.1 S4.2 S4.6 P3 shows the role, k of n, each match with linked sources, the gaps, the questions and the actions', () => {
    const html = draw('P3')
    const text = textOf(html)
    expect(text).toContain(PREP_ANSWER.role)
    expect(text).toContain(PREP.matches(5, 8))
    for (const match of PREP_ANSWER.matches) expect(text).toContain(match.requirement)
    expect(html).toContain('href="/vindecoded-agents#new-features-ship-dark"')
    for (const gap of PREP_ANSWER.gaps) expect(text).toContain(gap)
    for (const question of PREP_ANSWER.questions) expect(text).toContain(question)
    for (const action of [PREP.copy, PREP.email, 'Inspect', PREP.another]) expect(text).toContain(action)
    expect(html).toContain('href="mailto:brad@bradthome.com?subject=')
  })

  test('S4.3 FR-006 a named role says its requirements are inferred', () => {
    expect(textOf(draw('P3R'))).toContain(PREP.inferred)
    expect(textOf(draw('P3'))).not.toContain(PREP.inferred)
  })

  test('S4.7 P6 no fit says so, lists the gaps and offers Email Brad and Map another role', () => {
    const text = textOf(draw('P6'))
    expect(text).toContain(PREP.noFit)
    expect(text).toContain(PREP.email)
    expect(text).toContain(PREP.another)
    expect(text).not.toContain('Strong matches')
  })

  test('S4.8 P4 shows the text and asks for a posting, with the example button', () => {
    const text = textOf(draw('P4'))
    expect(text).toContain('Brad Thome')
    expect(text).toContain(PREP.notPosting)
    expect(text).toContain(PREP.example)
  })

  test(`S5.3 PL with questions left says prep needs ${PREP_QUESTIONS}, how many are left, and that Ask still works`, () => {
    const text = textOf(draw('PL'))
    expect(text).toContain(PREP.limit.heading)
    expect(text).toContain(`${PREP_QUESTIONS} of a visitor’s ${QUESTIONS_PER_DAY} daily questions, and 2 are left today`)
    expect(text).toContain('in Ask')
  })

  test('S5.8 A11 A12 K2 paused, failed and the check show in prep, with the posting kept', () => {
    expect(textOf(draw('A11'))).toContain('The chat is resting today')
    for (const id of ['A12', 'K2']) {
      expect(textOf(draw(id)), id).toContain('Try again')
      expect(textOf(draw(id)), id).toContain(PREP.posting(wordsOf(EXAMPLE_POSTING)))
    }
  })

  test('S1.2 the chat’s welcome, in the gallery’s A2, invites an interviewer to switch', () => {
    const gallery = next.read('design-system.html')
    const a2 = gallery.slice(gallery.indexOf('id="chat-a2"'), gallery.indexOf('id="chat-k1"'))
    expect(textOf(a2)).toContain('Interviewing Brad? Switch to Interview prep and paste the job description.')
  })
})

describe('the release flag (D190)', () => {
  const PREP_MARKS = /Interview prep|Map Brad to this role|id="prep"|chat__modes/

  test('S9.1 FR-009 SC-006 a release build has no switch, no gallery prep section and no prep words in any script; the chat is still there', () => {
    for (const file of release.files.filter((name) => /\.(?:html|js)$/.test(name))) expect(release.read(file), file).not.toMatch(PREP_MARKS)
    expect(release.read('index.html')).toMatch(/data-chat-open/)
    expect(release.read('design-system.html')).toMatch(/id="chat"/)
    expect(next.read('design-system.html')).toMatch(/id="prep"/)
    expect(next.files.filter((name) => name.endsWith('.js')).some((name) => next.read(name).includes('Map Brad to this role'))).toBe(true)
  })

  test("S9.2 release.yml's build step, and only that step, sets BRADTHOME_RELEASE=1", () => {
    interface Step {
      name?: string
      run?: string
      env?: Record<string, string>
    }
    const workflow = parse(readFileSync(path.join(ROOT, '.github', 'workflows', 'release.yml'), 'utf8')) as {
      env?: Record<string, string>
      jobs: Record<string, { env?: Record<string, string>; steps?: Step[] }>
    }
    expect(workflow.env ?? {}).not.toHaveProperty('BRADTHOME_RELEASE')
    const setting = Object.values(workflow.jobs).flatMap((job) =>
      (job.steps ?? []).filter((step) => step.env?.BRADTHOME_RELEASE !== undefined),
    )
    expect(setting).toHaveLength(1)
    expect(setting[0]).toMatchObject({ run: 'pnpm site:build', env: { BRADTHOME_RELEASE: '1' } })
    for (const job of Object.values(workflow.jobs)) expect(job.env ?? {}).not.toHaveProperty('BRADTHOME_RELEASE')
  })

  test('SC-005 prep adds under 6 KB gzipped to the window on open, and nothing to the one module', () => {
    const module = (b: Build) => b.files.find((file) => /^_astro\/PreviewLink\.astro_astro_type_script.*\.js$/.test(file)) ?? ''
    // The one module names the window's chunk, whose hash differs, so it may differ by those few bytes.
    expect(Math.abs(gz(next.read(module(next))) - gz(release.read(module(release))))).toBeLessThan(16)
    expect(onOpen(next) - onOpen(release)).toBeLessThan(6_000)
  })

  test('FR-013 no page has an inline script', () => {
    for (const page of next.files.filter((file) => file.endsWith('.html'))) {
      for (const match of next.read(page).matchAll(/<script\b([^>]*)>/gi)) expect(match[1], page).toMatch(/\bsrc=/)
    }
  })
})
