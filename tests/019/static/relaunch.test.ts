import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'

// Spec 019, the v2.0 relaunch: the source, firebase.json, release.yml and,
// when there is one, the build, read as text. The browser checks are in
// tests/019/e2e, the check's in tests/019/unit.

const ROOT = path.resolve(import.meta.dirname, '../../..')
const SITE = path.join(ROOT, 'apps', 'site')
const SRC = path.join(SITE, 'src')
const DIST = path.join(SITE, 'dist')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')

/** Every file under a folder, as paths relative to the repo. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (name === 'node_modules' || name === 'dist') return []
    return statSync(full).isDirectory() ? filesUnder(full) : [path.relative(ROOT, full).replaceAll('\\', '/')]
  })
}

const sources = (): string[] => filesUnder(SRC).filter((file) => /\.(astro|mdx?|ts|tsx|css)$/.test(file))

interface Hosting {
  redirects?: { source: string; destination: string; type: number }[]
  rewrites?: unknown[]
}
interface Step {
  run?: string
  uses?: string
  env?: Record<string, string>
}
interface Job {
  needs?: string | string[]
  container?: { image?: string } | string
  steps?: Step[]
}

const hosting = (): Hosting => (JSON.parse(read('firebase.json')) as { hosting: Hosting }).hosting
const release = (): Record<string, Job> => (parse(read('.github', 'workflows', 'release.yml')) as { jobs: Record<string, Job> }).jobs
const ci = (): Record<string, Job> => (parse(read('.github', 'workflows', 'ci.yml')) as { jobs: Record<string, Job> }).jobs
const runs = (job: Job | undefined): string[] => (job?.steps ?? []).map((step) => step.run ?? '').filter((run) => run !== '')

/** A built page, or undefined when there's no build to read. */
const built = (file: string): string | undefined => (existsSync(path.join(DIST, file)) ? readFileSync(path.join(DIST, file), 'utf8') : undefined)

describe('the redesign is the site', () => {
  test('S1.1 FR-001 the home page renders the new home for every role, with no noindex and the canonical link to the root', () => {
    expect(read('apps', 'site', 'src', 'pages', 'index.astro')).toMatch(/<HomePage role="all" \/>/)
    const home = read('apps', 'site', 'src', 'components', 'home', 'HomePage.astro')
    expect(home).toMatch(/noindex=\{role !== 'all'\}/)
    expect(read('apps', 'site', 'src', 'components', 'home', 'roles.ts')).toMatch(/export const HOME_HREF = '\/'/)
    const page = built('index.html')
    if (page === undefined) return
    expect(page).toMatch(/<link rel="canonical" href="https:\/\/bradthome\.com\/"/)
    expect(page).not.toMatch(/name="robots"/)
    expect(page).toMatch(/id="hopper"/)
  })

  test('S1.2 FR-001 Hosting redirects /v2 to the root with a 301, and rewrites nothing (D162)', () => {
    expect(hosting().redirects).toEqual([{ source: '/v2', destination: '/', type: 301 }])
    expect(hosting().rewrites ?? []).toEqual([])
  })

  test('S1.3 FR-002 the build holds every phase 3 page and the PDFs, and no v2 page; the e2e test reads the served build too', () => {
    const pages = readdirSync(path.join(SRC, 'pages'))
    expect(pages).not.toContain('v2.astro')
    for (const page of ['index.astro', '[role].astro', 'privacy.astro', 'design-system.astro', 'vindecoded-agents.mdx', '404.astro'])
      expect(pages, page).toContain(page)
    if (!existsSync(path.join(DIST, 'index.html'))) return
    const files = filesUnder(DIST).map((file) => path.relative(path.relative(ROOT, DIST), file).replaceAll('\\', '/'))
    for (const page of ['mobile.html', 'fullstack.html', 'ai.html', 'privacy.html', 'design-system.html', 'robots.txt', 'sitemap.xml', 'resume/brad-thome-mobile.pdf', 'resume/brad-thome-full-stack.pdf', 'resume/brad-thome-applied-ai.pdf'])
      expect(files, page).toContain(page)
    expect(files).not.toContain('v2.html')
  })

  test('S1.4 SC-004 no source links /v2, and only the redirect names it', () => {
    for (const file of sources()) expect(read(file), file).not.toMatch(/["'`(]\/v2(?:[#"'`)/]|$)/m)
    expect(JSON.stringify(hosting().redirects)).toContain('"/v2"')
  })

  test("S1.5 the design layout gives a page with a canonical URL v1's link-preview tags", () => {
    const layout = read('apps', 'site', 'src', 'layouts', 'DesignBase.astro')
    for (const tag of [
      '<meta name="author" content="Brad Thome" />',
      '<link rel="canonical" href={canonical} />',
      '<meta property="og:type" content="website" />',
      '<meta property="og:site_name" content="Brad Thome" />',
      '<meta property="og:title" content={title} />',
      '<meta property="og:description" content={description} />',
      '<meta property="og:url" content={canonical} />',
      '<meta name="twitter:card" content="summary" />',
    ])
      expect(layout, tag).toContain(tag)
    const page = built('index.html')
    if (page === undefined) return
    expect(page).toContain('<meta property="og:url" content="https://bradthome.com/">')
  })
})

describe('only the home and the essay are indexable', () => {
  test('S2.1 FR-004 the role pages, the privacy note and the gallery carry noindex; the home and the essay do not (D168)', () => {
    expect(read('apps', 'site', 'src', 'layouts', 'DesignBase.astro')).toMatch(/noindex = true/)
    expect(read('apps', 'site', 'src', 'layouts', 'Base.astro')).not.toMatch(/noindex/)
    for (const page of ['privacy.astro', 'design-system.astro']) expect(read('apps', 'site', 'src', 'pages', page), page).not.toMatch(/noindex=\{false\}/)
    if (!existsSync(path.join(DIST, 'index.html'))) return
    for (const page of ['mobile.html', 'fullstack.html', 'ai.html', 'privacy.html', 'design-system.html'])
      expect(built(page), page).toContain('<meta name="robots" content="noindex">')
    for (const page of ['index.html', 'vindecoded-agents.html']) expect(built(page), page).not.toMatch(/name="robots"/)
  })

  test('S2.2 FR-004 robots.txt allows every path and names the sitemap', () => {
    expect(read('apps', 'site', 'public', 'robots.txt')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://bradthome.com/sitemap.xml\n')
  })

  test('S2.3 FR-004 the sitemap lists exactly the home and the essay, at their canonical URLs', () => {
    const sitemap = read('apps', 'site', 'public', 'sitemap.xml')
    expect([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])).toEqual([
      'https://bradthome.com/',
      'https://bradthome.com/vindecoded-agents',
    ])
    expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/)
  })
})

describe('the essay keeps its words', () => {
  test("S3.1 FR-005 the essay's title is D163's, and its description and date are today's", () => {
    const essay = read('apps', 'site', 'src', 'pages', 'vindecoded-agents.mdx')
    expect(essay).toMatch(/^title: Running a 1\.4M-download product with AI agents$/m)
    expect(essay).toMatch(/^date: 2026-10-28$/m)
    expect(essay).toMatch(/^description: How VINDecoded ships with AI agents writing most of the code\./m)
    expect(essay).not.toMatch(/How one person runs/)
  })
})

describe('nothing keeps phase 3 off live', () => {
  test('S4.1 FR-002 SC-004 no source, script or workflow reads BRADTHOME_RELEASE, and release-pages.ts is gone', () => {
    expect(existsSync(path.join(ROOT, 'scripts', 'site', 'release-pages.ts'))).toBe(false)
    const files = [...filesUnder(path.join(ROOT, 'scripts')), ...filesUnder(path.join(ROOT, '.github')), ...filesUnder(SRC), 'apps/site/astro.config.mjs']
    for (const file of files.filter((name) => /\.(ts|mjs|ya?ml|astro|mdx?)$/.test(name))) expect(read(file), file).not.toMatch(/BRADTHOME_RELEASE/)
  })

  test("S4.2 FR-003 release.yml checks the tag on the runner, then builds as ci / build does, in the pinned container with WeasyPrint and the CSP check", () => {
    const jobs = release()
    expect(runs(jobs.tag)).toEqual(['node scripts/release/tag-check.ts'])
    expect(jobs.build?.needs).toEqual(['tag'])
    expect(jobs.build?.container).toEqual(ci().build?.container)
    expect(runs(jobs.build)).toEqual(runs(ci().build))
    expect(runs(jobs.build).join('\n')).toMatch(/pnpm printer:install[\s\S]*pnpm site:build[\s\S]*pnpm csp --check/)
  })
})

describe('analytics only on bradthome.com', () => {
  test("S6.1 the sender still sends only when the host is exactly bradthome.com, and only umami.ts names Umami's host", () => {
    expect(read('apps', 'site', 'src', 'components', 'analytics', 'analytics.client.ts')).toMatch(/hostname: location\.hostname/)
    expect(read('apps', 'site', 'src', 'components', 'analytics', 'payload.ts')).toMatch(/if \(hostname !== HOST\) return false/)
    expect(read('apps', 'site', 'src', 'components', 'analytics', 'umami.ts')).toMatch(/export const HOST = 'bradthome\.com'/)
    const naming = sources().filter((file) => read(file).includes('gateway.umami.is'))
    expect(naming).toEqual(['apps/site/src/components/analytics/umami.ts'])
  })
})

describe('the docs', () => {
  test('FR-010 D162–D168 are recorded and indexed, and the plan marks slice 3.11', () => {
    const index = read('docs', 'decisions', 'README.md')
    for (const id of ['0162', '0163', '0164', '0165', '0166', '0167', '0168']) {
      const file = readdirSync(path.join(ROOT, 'docs', 'decisions')).find((name) => name.startsWith(`${id}-`))
      expect(file, id).toBeDefined()
      expect(index, id).toContain(`[${id}](${file ?? ''})`)
      expect(read('docs', 'decisions', file ?? ''), id).toMatch(/^status: accepted$/m)
    }
    expect(read('docs', 'plan.md')).toMatch(/\| 3\.11 Relaunch \(v2\.0\) \|[^\n]*spec 019/)
  })
})
