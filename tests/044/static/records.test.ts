import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { pulseBuildOf, PULSE, shortDayOf } from '../../../apps/site/src/components/home/side.ts'
import { SECTIONS, UPDATED } from '../../../apps/site/src/components/privacy/privacy.ts'
import { pulseSnapshotSchema } from '../../../apps/site/src/content/previews.ts'

// Spec 044, Stories 1, 3, 4 and 5: the workflow is gone and D247 says why,
// the docs say how to run the job and bring it live (D248), the card's and
// /privacy's words are Brad's approved ones, and the repo's name is nowhere
// in the repo.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')
const WORKFLOWS = path.join(ROOT, '.github', 'workflows')

describe('the weekly workflow is gone (story 4)', () => {
  test('S4.1 FR-006 SC-003 no previews.yml, no workflow refreshes the previews or asks an App token, and only nightly and setup run on a schedule', () => {
    const names = readdirSync(WORKFLOWS)
    expect(names).not.toContain('previews.yml')
    const scheduled: string[] = []
    for (const name of names) {
      const text = readFileSync(path.join(WORKFLOWS, name), 'utf8')
      expect(text, name).not.toMatch(/previews:refresh|create-github-app-token|PREVIEWS_APP_/)
      if (/^\s*schedule:/m.test(text)) scheduled.push(name)
    }
    expect(scheduled.sort()).toEqual(['nightly.yml', 'setup.yml'])
  })

  test('S4.2 FR-006 the pull request scripts and their test are gone, and nothing imports them', () => {
    for (const file of ['scripts/previews/open-pr.ts', 'scripts/previews/open-pr-lib.ts', 'tests/016/unit/open-pr.test.ts'])
      expect(existsSync(path.join(ROOT, file)), file).toBe(false)
    const result = spawnSync('git', ['grep', '-l', '-e', 'open-pr-lib', '-e', 'previews/open-pr', '--', 'scripts', 'apps', 'tests', 'package.json'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(result.stdout.trim()).toBe('')
  })

  test('S4.3 FR-006 FR-009 D247 and D248 are recorded and indexed, and D48, D146 and D240 point to D247', () => {
    const index = read('docs', 'decisions', 'README.md')
    for (const id of ['0247', '0248']) expect(index, id).toMatch(new RegExp(`\\[${id}\\]\\(${id}-`))
    const d247 = read('docs', 'decisions', '0247-the-previews-and-the-pr-count-refresh-by-hand-on-brads-pc.md')
    expect(d247).toMatch(/^log-id: D247$/m)
    expect(d247).toMatch(/never created|was\.\s|neither was/)
    expect(d247).toMatch(/Amends \[D48\][^\n]*\[D146\][^\n]*\[D240\]/)
    expect(read('docs', 'decisions', '0248-a-refresh-only-release-takes-a-short-path.md')).toMatch(/^log-id: D248$/m)
    for (const record of [
      '0048-the-test-and-quality-batch.md',
      '0146-a-github-app-opens-the-previews-refresh-pull-request.md',
      '0240-live-numbers-from-the-sites-own-api.md',
    ])
      expect(read('docs', 'decisions', record), record).toMatch(/Amended by \[D247\]\(0247-/)
  })

  test('S4.3 FR-009 the plan, AGENTS.md and the other specs no longer name the weekly job or the App as current', () => {
    expect(read('docs', 'plan.md')).toMatch(/\| 5\.17 [^\n]*spec 044[^\n]*D247/)
    const agents = read('AGENTS.md')
    expect(agents).toMatch(/Seven workflows sit outside the gate/)
    expect(agents).not.toMatch(/every Monday/)
    expect(agents).toMatch(/bradthome\.pulseRepo/)
    for (const spec of ['002-ci-and-rulesets', '016-link-previews', '021-chat-api', '041-vindecoded-pulse'])
      expect(read('specs', spec, 'spec.md'), spec).toMatch(/spec 044[^\n]*D247|D247[^\n]*spec 044/)
  })
})

describe('the docs (story 1)', () => {
  test('S1.7 docs/release.md says how to add the setting, run the job, and bring a refresh live', () => {
    const release = read('docs', 'release.md')
    expect(release).toMatch(/git config --global bradthome\.pulseRepo <owner>\/<name>/)
    expect(release).toMatch(/pnpm previews:refresh/)
    expect(release).toMatch(/gh auth login/)
    expect(release).toMatch(/\*\*Push\*\*[^\n]*Brad says push/)
    expect(release).toMatch(/\*\*Release\*\* them, since the numbers are built into the page/)
  })

  test('S1.8 a refresh-only release takes a short path, and says what it skips and keeps', () => {
    const release = read('docs', 'release.md')
    expect(release).toMatch(/### A refresh-only release/)
    expect(release).toMatch(/lists only `apps\/site\/content\/previews\/` and `apps\/site\/public\/previews\/`/)
    expect(release).toMatch(/the next patch version, with no version card/)
    expect(release).toMatch(/no rollback rehearsal on preview channels/)
    expect(release).toMatch(/words-may-change=home`, the pre-release check, Brad's approval in `production`/)
    expect(release).toMatch(/Any other file in that diff means the usual release/)
  })

  test('S1.3 SC-002 FR-002 the repo named by this PC\'s setting is in no tracked file (checked where the setting is)', () => {
    const setting = spawnSync('git', ['config', '--get', 'bradthome.pulseRepo'], { encoding: 'utf8' })
    const repo = setting.status === 0 ? setting.stdout.trim() : ''
    if (repo === '') return // CI has no setting, so nothing to look for.
    const found = spawnSync('git', ['grep', '-l', '-i', '-F', '-e', repo], { cwd: ROOT, encoding: 'utf8' })
    // Only file names are compared, never the setting's value.
    expect(found.stdout.trim().split('\n').filter(Boolean)).toEqual([])
    const name = repo.split('/')[1] ?? ''
    if (name.length > 6) {
      const byName = spawnSync('git', ['grep', '-l', '-i', '-F', '-e', name, '--', 'apps', 'scripts', 'specs/044-pulse-manual', 'docs'], {
        cwd: ROOT,
        encoding: 'utf8',
      })
      expect(byName.stdout.trim().split('\n').filter(Boolean)).toEqual([])
    }
  })
})

describe("the card's and /privacy's words (story 3)", () => {
  test('S3.1 S3.3 S3.6 FR-004 the PR tile is dated by its own day, the line by the App Store\'s, and no word names GitHub as live or a token', () => {
    const pulse = pulseSnapshotSchema.parse(JSON.parse(read('apps', 'site', 'content', 'previews', 'pulse.json')))
    const built = pulseBuildOf(pulse, undefined)
    expect(built.counted).toBe(pulse.github.fetched)
    expect(built.asOf).toBe(pulse.appStore.fetched)
    expect(`${PULSE.mergedSub} ${shortDayOf('2026-11-18')}`).toBe('In the 30 days to Nov 18')
    expect(`${PULSE.built} · as of ${shortDayOf('2026-11-18')}`).toBe('From the App Store · as of Nov 18')
    const words = JSON.stringify(PULSE)
    expect(words).not.toMatch(/token|GitHub[^"]*(live|hourly)|App Store · GitHub/)
    const markup = read('apps', 'site', 'src', 'components', 'home', 'SidePulse.astro')
    expect(markup).toMatch(/data-pulse="counted"/)
    // One live dot, on the release's tile.
    expect(markup.match(/data-pulse="dot"/g)).toHaveLength(1)
  })

  test('S3.2 S3.4 the script swaps in the App Store alone and writes the line in Brad\'s words', () => {
    const client = read('apps', 'site', 'src', 'components', 'home', 'pulse.client.ts')
    expect(client).toMatch(/Live from the App Store · updated \$\{age\(appAt\)\}/)
    expect(client).not.toMatch(/answer\.github|set\('merged'|data-pulse="merged"|GitHub/)
    expect(PULSE.note).toMatch(/counted on Brad’s own computer/)
    expect(PULSE.steps.map((step) => step.title)).toEqual(['App Store', 'The site’s API', 'This card'])
  })

  test('S3.5 FR-005 /privacy says the count is built in, Apple alone is asked, and the note moved to 2026-11-18', () => {
    const section = SECTIONS.find((each) => each.id === 'pulse')
    expect(section?.items?.[0]).toMatch(/latest iOS release and rating\. Nothing about you is sent with it\.$/)
    expect(section?.items?.[1]).toBe(
      'That service gets them from Apple’s public App Store listing on its own, at most once an hour. Apple never sees your visit. The count of merged pull requests is built into the page, so nothing is fetched for it.',
    )
    expect(JSON.stringify(section)).not.toMatch(/GitHub/)
    expect(UPDATED).toBe('2026-11-18')
  })
})

describe('what holds (story 5)', () => {
  test('S5.6 FR-009 specs 001–003 keep their locks, and spec 002 notes that FR-015 has no holder', () => {
    for (const spec of ['001-hooks-and-agent-rules', '002-ci-and-rulesets', '003-skeleton-and-pipeline'])
      expect(existsSync(path.join(ROOT, 'specs', spec, 'tests.lock')), spec).toBe(true)
    for (const spec of ['001-hooks-and-agent-rules', '002-ci-and-rulesets', '003-skeleton-and-pipeline']) {
      const check = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'lock-tests.ts'), `specs/${spec}`, '--check'], {
        cwd: ROOT,
        encoding: 'utf8',
      })
      expect(check.status, check.stdout + check.stderr).toBe(0)
    }
    expect(read('specs', '002-ci-and-rulesets', 'spec.md')).toMatch(/Changed in spec 044[^\n]*FR-015's allowance[^\n]*has no holder/)
  })
})
