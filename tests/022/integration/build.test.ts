import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { parse } from 'yaml'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

// Spec 022 in a real build, which since v2.1 is every build's, the release's
// included: spec 023 removed the release flag (D190, D198). It holds all of
// the chat, with its window in its own chunk, loaded only on open (S1.4,
// FR-001, SC-002). It builds into the checkout's ignored node_modules/.cache, as spec 018's test
// does, since Astro's rename fails across drives on CI's Windows runner.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const SITE = path.join(ROOT, 'apps', 'site')
const PAGES_WITH_CHAT = ['index.html', 'mobile.html', 'fullstack.html', 'ai.html']
const CHAT_MARKS = /data-chat-open|data-chat-dialog|data-chat-root|chat-held|id="chat"/

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

function build(): Build {
  const cache = path.join(ROOT, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  const out = mkdtempSync(path.join(cache, 'bradthome-022-'))
  const astro = path.join(SITE, 'node_modules', 'astro', 'bin', 'astro.mjs')
  // CI's test runners have no WeasyPrint, so this builds as a local build does (spec 018's test).
  const env = { ...process.env, CI: '' }
  const result = spawnSync(process.execPath, [astro, 'build', '--outDir', out], { cwd: SITE, encoding: 'utf8', env })
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`)
  const files = filesIn(out).map((file) => path.relative(out, file).replaceAll('\\', '/'))
  return { out, files, read: (name) => readFileSync(path.join(out, name), 'utf8') }
}

const gz = (text: string) => gzipSync(text).length
const oneModule = (b: Build) => {
  const name = b.files.find((file) => /^_astro\/PreviewLink\.astro_astro_type_script.*\.js$/.test(file))
  if (name === undefined) throw new Error('no one module')
  return name
}
/** A chunk and every chunk it imports, by name. */
function withImports(b: Build, start: string): string[] {
  const seen = new Set<string>()
  const visit = (name: string) => {
    if (seen.has(name)) return
    seen.add(name)
    for (const match of b.read(name).matchAll(/from\s*["'`]\.\/([\w.-]+\.js)["'`]/g)) visit(`_astro/${match[1]}`)
  }
  visit(start)
  return [...seen]
}

let next: Build

beforeAll(() => {
  next = build()
})

afterAll(() => {
  if (next !== undefined) rmSync(next.out, { recursive: true, force: true })
})

describe('the build previews and next serve', () => {
  test('S9.1 S1.1 S1.2 the home and the role pages have the button and the dialog, and the gallery has the chat section', () => {
    for (const page of PAGES_WITH_CHAT) {
      const html = next.read(page)
      expect(html, page).toMatch(/<button[^>]*data-chat-open/)
      expect(html, page).toMatch(/<dialog[^>]*data-chat-dialog/)
    }
    expect(next.read('design-system.html')).toMatch(/id="chat"/)
    for (const page of ['vindecoded-agents.html', '404.html', 'privacy.html']) expect(next.read(page), page).not.toMatch(CHAT_MARKS)
  })

  test('S1.4 FR-001 the page loads only the one module; the window is its own chunk, which the module imports only on open', () => {
    const html = next.read('index.html')
    const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0])
    expect(scripts).toEqual([expect.stringMatching(/^<script type="module" src="\/_astro\/PreviewLink\.astro_astro_type_script/)])
    const module = next.read(oneModule(next))
    expect(module).toMatch(/import\(\s*["'`]\.\/mount\.[\w-]+\.js["'`]\s*\)/)
    expect(module).not.toMatch(/react\.transitional\.element|createRoot/)
    expect(next.files.some((file) => /^_astro\/mount\.[\w-]+\.js$/.test(file))).toBe(true)
  })

  test('S9.3 FR-010 no page has an inline script, and the window ships as files under /_astro/', () => {
    for (const page of next.files.filter((file) => file.endsWith('.html'))) {
      for (const match of next.read(page).matchAll(/<script\b([^>]*)>/gi)) expect(match[1], page).toMatch(/\bsrc=/)
    }
  })

  test('SC-002 the one module stays under 3.9 KB gzipped, its 2.4 KB without the chat plus 1.5 KB, and the window on open is under 85 KB gzipped', () => {
    // Spec 022 measured the growth against the release build, which spec 023 retired with its flag.
    expect(gz(next.read(oneModule(next)))).toBeLessThan(3_900)
    const mount = next.files.find((file) => /^_astro\/mount\.[\w-]+\.js$/.test(file)) ?? ''
    const onOpen = withImports(next, mount).filter((name) => name !== oneModule(next))
    const total = onOpen.reduce((sum, name) => sum + gz(next.read(name)), 0)
    expect(total).toBeLessThan(85_000)
  })

  test('FR-008 S8.2 no build output of the chat names a storage API or the analytics host', () => {
    const mount = next.files.find((file) => /^_astro\/mount\.[\w-]+\.js$/.test(file)) ?? ''
    const own = next.read(mount)
    expect(own).not.toMatch(/localStorage|sessionStorage|document\.cookie|gateway\.umami\.is/)
  })
})

test("S9.1 S9.2 since v2.1 no build leaves the chat out: release.yml's build sets no flag, and nothing reads one (spec 023, D198)", () => {
  interface Step {
    run?: string
    env?: Record<string, string>
  }
  interface Workflow {
    env?: Record<string, string>
    jobs: Record<string, { env?: Record<string, string>; steps?: Step[] }>
  }
  const workflow = parse(readFileSync(path.join(ROOT, '.github', 'workflows', 'release.yml'), 'utf8')) as Workflow
  expect(workflow.env ?? {}).not.toHaveProperty('BRADTHOME_RELEASE')
  for (const [name, job] of Object.entries(workflow.jobs)) {
    expect(job.env ?? {}, name).not.toHaveProperty('BRADTHOME_RELEASE')
    for (const step of job.steps ?? []) expect(step.env ?? {}, `${name}: ${step.run ?? ''}`).not.toHaveProperty('BRADTHOME_RELEASE')
  }
  expect(readFileSync(path.join(SITE, 'astro.config.mjs'), 'utf8')).not.toMatch(/BRADTHOME|chatDefine|chatAliases/)
})
