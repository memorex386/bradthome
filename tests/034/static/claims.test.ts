import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'
import { llmsOf } from '../../../apps/site/src/corpus/corpus.ts'
import { sourcesOf } from '../../../apps/site/src/components/ds/proof.ts'
import { RECEIPT_TITLES, storyOf, TOPICS, type StoryClaim } from '../../../apps/site/src/components/home/hopper.ts'
import { topicOrderOf } from '../../../apps/site/src/components/home/roles.ts'
import { SOURCE_LABELS } from '../../../apps/site/src/components/home/sources.ts'

// Spec 034: the Capital One card in LinkedIn's words with its first receipt,
// the Mobile card's new claims, and what must not break or leak (D219). It
// reads the exported claims, the corpus built from them, and the repo's files.
// Since spec 038 (D229, D230) the card lists the offer card's two sources at
// rest, under its claims, in place of its receipts drawer, and each claim
// ends with its sparkle.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')

interface Claim {
  subject: string
  topic?: string
  order: number
  text: string
  evidence: string[]
  visibility: string
}
const CLAIMS = parse(read('apps', 'site', 'content', 'claims.yaml')) as Record<string, Claim>
const hopper = (): StoryClaim[] =>
  Object.entries(CLAIMS)
    .filter(([, claim]) => claim.subject === 'hopper')
    .map(([id, claim]) => ({ id, topic: claim.topic, order: claim.order, text: claim.text, evidence: claim.evidence }))
const topic = (name: string) => storyOf(hopper()).topics.find((item) => item.name === name)

const POST = 'https://yourmileagemayvary.com/2024/07/22/how-to-beat-deltas-meltdown-with-capital-ones-flight-disruption-assistance/'
const RELEASE = 'https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one'

// The claims before this slice, which keep their words.
const LAUNCH =
  "Launched Capital One Travel's first post-booking Disruption Assistance purchase flow as sole engineering owner, driving substantial incremental revenue for Hopper and Capital One and creating a reusable capability adopted by 5 more partners."
const EXPANSION = 'Expanded Disruption Assistance to 10+ partner products, including Frontier and Spirit airline integrations.'
const WEBVIEWS = 'Replaced native screens with WebViews using JavaScript bridges, authentication handoff and two-way native–web messaging.'

describe('the Capital One card (story 1)', () => {
  test('S1.1 FR-001 four claims in order: the launch and expansion as they were, the end-to-end claim, then the offer card', () => {
    const card = topic('Disruption Assistance')
    expect(card?.items.map((item) => item.id)).toEqual([
      'hopper-disruption-assistance-1',
      'hopper-disruption-assistance-2',
      'hopper-disruption-assistance-3',
      'hopper-disruption-assistance-4',
    ])
    expect(CLAIMS['hopper-disruption-assistance-1']?.text).toBe(LAUNCH)
    expect(CLAIMS['hopper-disruption-assistance-3']?.text).toBe(EXPANSION)
    expect(storyOf(hopper()).topics[0]?.name).toBe('Disruption Assistance')
  })

  test('S1.2 FR-002 the end-to-end claim names everything LinkedIn lists', () => {
    const text = CLAIMS['hopper-disruption-assistance-2']?.text ?? ''
    for (const part of [
      'the RFC and ADR',
      'stakeholder alignment',
      'new services on Terraform-provisioned GCP',
      'backend APIs',
      'a payment flow with rewards points',
      'offer generation and Redis caching',
      'React front end',
      'home-screen bottom sheet',
      'the offer and the purchase',
      'feature flags',
      'phased rollout',
      'analytics, monitoring and alerting',
    ])
      expect(text, part).toContain(part)
    expect(CLAIMS['hopper-disruption-assistance-2']?.evidence).toEqual([])
  })

  // Amended by spec 038 (D229, D230): the drawer and its "1 with a public link · 3 to ask about" are gone. The offer
  // card's claim is still the card's one with public links, and the card lists both under its claims, at rest, with
  // spec 038's labels and their hosts, before its tags. The claim ends with its sparkle, as every claim does.
  test('S1.3 FR-003 the offer card is the one claim with links, titled for what it shows, and the card lists the post and then the release', () => {
    expect(CLAIMS['hopper-disruption-assistance-4']?.evidence).toEqual([POST, RELEASE])
    expect(RECEIPT_TITLES['hopper-disruption-assistance-4']).toBe('The offer card, as a customer saw it')
    const items = topic('Disruption Assistance')?.items ?? []
    expect(items.map((item) => item.evidence.length > 0)).toEqual([false, false, false, true])
    const claim = 'hopper-disruption-assistance-4'
    expect(sourcesOf(items, [], SOURCE_LABELS)).toEqual([
      { href: POST, label: 'The offer card, in a 2024 travel-blog post', host: 'yourmileagemayvary.com', outside: true, claim },
      { href: RELEASE, label: 'Hopper Technology Solutions, March 2026', host: 'hts.hopper.com', outside: true, claim },
    ])
    expect(TOPICS['Disruption Assistance']?.tags).toEqual(['React', 'Payment flow', 'Terraform', 'GCP', 'Redis', 'Feature flags'])
    // A Hopper card links nothing of its own, and lists its sources between its claims and its tags.
    expect(read('apps', 'site', 'src', 'components', 'home', 'Hopper.astro')).toMatch(
      /<\/div>\s*<Sources sources=\{sourcesOf\(topic\.items, \[\], SOURCE_LABELS\)\} id=\{`sources-hopper-\$\{topic\.slug\}`\} \/>\s*\{topic\.tags\.length > 0 && <Chips /,
    )
    // On the built home, when there is one: the claim ends with its sparkle, and the two sources follow the claims.
    const dist = path.join(ROOT, 'apps', 'site', 'dist', 'index.html')
    if (!existsSync(dist)) return
    const html = readFileSync(dist, 'utf8')
    const start = html.indexOf('id="hopper-disruption-assistance"')
    const end = html.indexOf('aria-label="Capital One Travel: Disruption Assistance, tags"', start)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const card = html.slice(start, end)
    const at = card.indexOf(`id="receipt-${claim}"`)
    const body = card.slice(at, card.indexOf('</p>', at))
    const sparkle = /<span class="ds-claim__end">customers\.(<a class="ds-claim-ask"[^>]*>)[\s\S]*<\/a><\/span>$/.exec(body)
    expect(sparkle, 'the sparkle ends the claim').not.toBeNull()
    for (const attribute of [
      'href="#contact"',
      `data-chat-ask="Tell me more about this: “${CLAIMS[claim]?.text ?? ''}”"`,
      'aria-label="Ask about this: The offer card, as a customer saw it"',
    ])
      expect(sparkle?.[1], attribute).toContain(attribute)
    const sources = card.slice(card.indexOf('<div class="ds-sources">'))
    expect(card.indexOf('<div class="ds-sources">')).toBeGreaterThan(at)
    expect(sources).toContain('<p class="ds-sources__label" id="sources-hopper-disruption-assistance-label">Sources</p>')
    expect(
      [
        ...sources.matchAll(
          /<a class="ds-source" href="([^"]+)"[^>]*><span class="ds-source__label">([^<]+)<\/span><span class="ds-source__host">([^<]+)<svg class="ds-icon ds-source__out"/g,
        ),
      ].map((match) => match.slice(1)),
    ).toEqual([
      [POST, 'The offer card, in a 2024 travel-blog post', 'yourmileagemayvary.com'],
      [RELEASE, 'Hopper Technology Solutions, March 2026', 'hts.hopper.com'],
    ])
  })

  test('S1.4 the offer-card claim says what the links show, and never that they name Brad or prove Brad’s role', () => {
    const text = CLAIMS['hopper-disruption-assistance-4']?.text ?? ''
    expect(text).toMatch(
      /^A 2024 travel-blog post shows the Flight disruption assistance offer card Brad built, as a Capital One Travel customer saw it\./,
    )
    expect(text).toMatch(
      /In March 2026, Hopper Technology Solutions said it still delivers Flight Disruption Assistance to Capital One customers\.$/,
    )
    expect(text).not.toMatch(/\bnam(e|es|ed|ing)\b|\bprov(e|es|ed|ing)\b|\bcredit|\bconfirm/i)
  })

  // Amended by spec 038 (D229): the card lists both sources at rest, so their labels sit in sources.ts, keyed by their
  // links. Which specs' tests check the card moves with spec 038 (spec 026's are gone), so any spec's test may link the
  // two, as this one does; no other file may, beside the claim and the labels.
  test("S1.5 nothing from either source is copied in: no file, image or embed holds their pages, only the claim, its sources' labels and tests link them", () => {
    const hosts = /yourmileagemayvary|hts\.hopper\.com/i
    const skip = new Set(['node_modules', '.git', 'dist', '.astro', 'test-results', 'playwright-report'])
    const found: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (skip.has(name)) continue
        const full = path.join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (hosts.test(name)) found.push(path.relative(ROOT, full))
        else if (/\.(ts|tsx|astro|css|ya?ml|json|md|mdx|html|svg)$/.test(name) && hosts.test(readFileSync(full, 'utf8')))
          found.push(path.relative(ROOT, full).replaceAll('\\', '/'))
      }
    }
    for (const top of ['apps', 'tests', 'specs', 'docs', 'scripts']) walk(path.join(ROOT, top))
    // Amended by spec 038 (D229): spec 026's drawer test left with the drawers; the source labels name the two hosts,
    // with no address of theirs, and spec 038's tests check the list they label.
    expect(found.sort()).toEqual(
      [
        'apps/evals/results.json',
        'apps/site/content/claims.yaml',
        'apps/site/src/components/home/sources.ts',
        'tests/011/e2e/hopper.test.ts',
        'tests/016/static/cards.test.ts',
        'tests/034/static/claims.test.ts',
        'tests/038/e2e/proof.test.ts',
        'tests/038/static/proof.test.ts',
      ]
        .filter((file) => file !== 'apps/evals/results.json' || found.includes(file))
        .sort(),
    )
    // Spec 038: the labels go by claim and host, so the site's source names the two hosts but holds no address of theirs.
    expect(Object.values(SOURCE_LABELS).flatMap((labels) => Object.keys(labels).filter((host) => hosts.test(host)))).toEqual([
      new URL(POST).host,
      new URL(RELEASE).host,
    ])
    expect(read('apps', 'site', 'src', 'components', 'home', 'sources.ts')).not.toMatch(/https?:\/\//)
    const dist = path.join(ROOT, 'apps', 'site', 'dist', 'index.html')
    if (existsSync(dist)) {
      const html = readFileSync(dist, 'utf8')
      expect(html).not.toMatch(/<(img|iframe|source|video)\b[^>]*(yourmileagemayvary|hts\.hopper\.com)/i)
      expect(html).toContain(`href="${POST}"`)
    }
  })
})

describe('the Mobile card (story 2)', () => {
  test('S2.1 FR-004 RemoteUI reads "co-architected and built", with Compose and SwiftUI, and "Co-developed RemoteUI" is nowhere on the site or in the chat’s results', () => {
    const text = CLAIMS['hopper-mobile-remoteui-and-webviews-1']?.text ?? ''
    expect(text).toMatch(/^Co-architected and built RemoteUI, a server-driven UI framework/)
    expect(text).toContain('Jetpack Compose and MVVM on Android and SwiftUI on iOS')
    const places = [
      read('apps', 'site', 'content', 'claims.yaml'),
      read('apps', 'site', 'src', 'components', 'chat', 'prep-fixtures.ts'),
      read('apps', 'evals', 'src', 'cases.ts'),
      read('apps', 'evals', 'results.json'),
    ]
    for (const place of places) expect(place).not.toMatch(/co-developed RemoteUI|co-developed RemoteUI/i)
    const dist = path.join(ROOT, 'apps', 'site', 'dist')
    if (existsSync(dist))
      for (const page of readdirSync(dist).filter((name) => name.endsWith('.html') || name.endsWith('.json') || name.endsWith('.txt')))
        expect(readFileSync(path.join(dist, page), 'utf8'), page).not.toMatch(/co-developed RemoteUI/i)
  })

  // Amended by spec 038 (D229, D230): no claim asks from a drawer now. The four have no public link, so the card lists
  // no sources, and each reads as plain text that ends with its sparkle.
  test('S2.2 the Mobile card reads RemoteUI, WebViews, then joining on Android and the Koin migration, none with a public link', () => {
    const card = topic('Mobile: RemoteUI and WebViews')
    expect(card?.items.map((item) => [item.id, item.evidence])).toEqual([
      ['hopper-mobile-remoteui-and-webviews-1', []],
      ['hopper-mobile-remoteui-and-webviews-2', []],
      ['hopper-mobile-remoteui-and-webviews-3', []],
      ['hopper-mobile-remoteui-and-webviews-4', []],
    ])
    expect(sourcesOf(card?.items ?? [], [], SOURCE_LABELS)).toEqual([])
    expect(card?.items[1]?.text).toBe(WEBVIEWS)
    expect(card?.items[2]?.text).toBe(
      'Joined Hopper on Android, then moved to full-stack work across Android, iOS, web front end and backend services, building Android and iOS features in Kotlin and Swift.',
    )
    expect(card?.items[3]?.text).toBe(
      "Migrated Hopper's entire Android app from Koin to Dagger/Hilt for compile-time-verified dependency injection.",
    )
    expect(card?.items.slice(2).map((item) => item.title)).toEqual(['Joined on Android, then full-stack', 'Koin to Dagger/Hilt'])
    expect(TOPICS['Mobile: RemoteUI and WebViews']?.tags).toEqual([
      'Android',
      'iOS',
      'Jetpack Compose',
      'SwiftUI',
      'Server-driven UI',
      'WebViews',
    ])
  })

  test('S2.3 /mobile still puts the Mobile card first, and each role page keeps its topic order', () => {
    expect(storyOf(hopper(), topicOrderOf('mobile')).topics[0]?.name).toBe('Mobile: RemoteUI and WebViews')
    expect(storyOf(hopper(), topicOrderOf('fullstack')).topics[0]?.name).toBe('Disruption Assistance')
    expect(storyOf(hopper(), topicOrderOf('ai')).topics[0]?.name).toBe('Fintech AI')
  })
})

describe('nothing that cites a claim breaks (story 3)', () => {
  test('S3.1 every Hopper claim before this slice keeps its ID, and the new ones follow in their topics', () => {
    const before = [
      'hopper-role-and-dates-1',
      'hopper-role-and-dates-2',
      'hopper-disruption-assistance-1',
      'hopper-disruption-assistance-2',
      'hopper-disruption-assistance-3',
      'hopper-partner-platform-1',
      'hopper-partner-platform-2',
      'hopper-partner-platform-3',
      'hopper-fintech-ai-1',
      'hopper-agent-and-experimentation-workflow-1',
      'hopper-mobile-remoteui-and-webviews-1',
      'hopper-mobile-remoteui-and-webviews-2',
      'hopper-stack-1',
    ]
    const ids = hopper().map((claim) => claim.id)
    for (const id of before) expect(ids, id).toContain(id)
    expect(ids.filter((id) => !before.includes(id)).sort()).toEqual([
      'hopper-disruption-assistance-4',
      'hopper-mobile-remoteui-and-webviews-3',
      'hopper-mobile-remoteui-and-webviews-4',
    ])
  })

  test('S3.2 /corpus.json and /llms.txt carry the new and reworded claims, with the offer card’s two links', () => {
    const corpus = loadCorpus(ROOT)
    const byId = new Map(corpus.sources.map((source) => [source.id, source]))
    for (const id of [
      'hopper-disruption-assistance-2',
      'hopper-disruption-assistance-4',
      'hopper-mobile-remoteui-and-webviews-1',
      'hopper-mobile-remoteui-and-webviews-3',
      'hopper-mobile-remoteui-and-webviews-4',
    ])
      expect(byId.get(id)?.text, id).toContain(CLAIMS[id]?.text.slice(0, 40) ?? '-')
    expect(byId.get('hopper-disruption-assistance-4')?.evidence).toEqual([POST, RELEASE])
    const llms = llmsOf(corpus)
    expect(llms).toContain('hopper-disruption-assistance-4')
    expect(llms).toContain('Co-architected and built RemoteUI')
  })

  test('S3.4 FR-001 no note-style bullet reached the claims: no dated aside, pronoun, or note about the site itself', () => {
    for (const [id, claim] of Object.entries(CLAIMS)) {
      expect(claim.visibility, id).toBe('public')
      expect(claim.text, id).not.toMatch(/\(\d{1,2}\/\d{1,2}\)|\bnot a site claim\b|own account|wording, settled|LinkedIn now|\*\*/)
      expect(claim.text, id).not.toMatch(/\b(he|him|his)\b/i)
    }
  })
})

describe('the résumé PDFs stay at two pages (FR-007)', () => {
  test('FR-007 Hopper’s story may break across pages, and the page keeps its type sizes', () => {
    const css = read('apps', 'site', 'src', 'styles', 'resume', 'print.css')
    expect(css).toMatch(/\.entry \{[^}]*break-inside: avoid;/)
    expect(css).toMatch(/\.entry--story \{\s*break-inside: auto;\s*\}/)
    expect(css).toMatch(/html \{[^}]*font-size: 16px;[^}]*line-height: 1\.34;/)
    expect(read('apps', 'site', 'src', 'components', 'resume', 'ResumeEntry.astro')).toMatch(/entry\.groups\.length > 1 && 'entry--story'/)
  })
})
