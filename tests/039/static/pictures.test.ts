import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { MARKS, OWNERS_LINE, shownWidth } from '../../../apps/site/src/components/home/marks.ts'
import { PHOTO, PHOTO_SIZES } from '../../../apps/site/src/components/home/contact.ts'

// Spec 039's static checks: the share tags in both layouts, where the marks
// and the photo may show, the owners line, the diagrams' lack of motion and
// script, the CSP, and the records. The browser's checks are in tests/039/e2e.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const SITE = path.join(ROOT, 'apps', 'site')
const SRC = path.join(SITE, 'src')
const read = (...parts: string[]): string => readFileSync(path.join(ROOT, ...parts), 'utf8')

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? filesIn(full) : [full]
  })
}

const sources = (): { file: string; text: string }[] =>
  filesIn(SRC)
    .filter((file) => /\.(astro|ts|tsx|css|mdx)$/.test(file))
    .map((file) => ({ file: path.relative(SRC, file).replaceAll('\\', '/'), text: readFileSync(file, 'utf8') }))

describe('the share tags (story 1)', () => {
  test('S1.5 FR-003 both layouts give og:image with its size and alt, and summary_large_image with twitter:image', () => {
    for (const layout of ['Base.astro', 'DesignBase.astro']) {
      const text = read('apps', 'site', 'src', 'layouts', layout)
      for (const tag of [
        '<meta property="og:image" content={image.url} />',
        '<meta property="og:image:width" content={String(image.width)} />',
        '<meta property="og:image:height" content={String(image.height)} />',
        '<meta property="og:image:alt" content={image.alt} />',
        '<meta name="twitter:card" content="summary_large_image" />',
        '<meta name="twitter:image" content={image.url} />',
        '<meta name="twitter:image:alt" content={image.alt} />',
      ])
        expect(text, `${layout}: ${tag}`).toContain(tag)
      expect(text, layout).not.toContain('content="summary" />')
      expect(text, layout).toMatch(/import \{ shareImageOf \} from '\.\.\/components\/share\/data\.ts'/)
    }
  })

  test('S1.6 FR-003 /evals passes its canonical URL, which turns its share tags on, and the 404 page still passes no share', () => {
    expect(read('apps', 'site', 'src', 'pages', 'evals.astro')).toMatch(/<DesignBase [^>]*canonical=\{`\$\{ORIGIN\}\/evals`\}>/)
    expect(read('apps', 'site', 'src', 'pages', '404.astro')).not.toMatch(/\bshare=/)
    expect(read('apps', 'site', 'src', 'pages', 'privacy.astro')).not.toMatch(/canonical=/)
  })

  test('S1.7 FR-001 FR-002 the cards are drawn after the résumé PDFs, from print pages the build removes', () => {
    const config = read('apps', 'site', 'astro.config.mjs')
    expect(config).toMatch(/integrations: \[react\(\), mdx\(\), resumePdfs, shareCards\]/)
    const step = read('scripts', 'site', 'share-cards.ts')
    expect(step).toMatch(/const second = await draw\(browser, dist, job\.id\)/)
    expect(step).toMatch(/if \(!first\.equals\(second\)\)/)
    expect(step).toMatch(/await route\.abort\('blockedbyclient'\)/)
    expect(step).toMatch(/throw new Error\("The share cards need Playwright's Chromium/)
    expect(read('apps', 'site', 'src', 'pages', 'share', '[card].astro')).toMatch(/getStaticPaths = \(\(\) => CARD_IDS\.map/)
  })
})

describe('everything else holds (story 8)', () => {
  test('S1.8 S8.1 FR-012 the CSP keeps its directives with no image source and no data: URL, and no source names a picture on another host', () => {
    const firebase = JSON.parse(read('firebase.json')) as { hosting: { headers: { headers: { key: string; value: string }[] }[] } }
    const csp =
      firebase.hosting.headers.flatMap((rule) => rule.headers).find((header) => header.key === 'Content-Security-Policy')?.value ?? ''
    expect(csp.split(';').map((part) => part.trim().split(' ')[0])).toEqual([
      'default-src',
      'object-src',
      'base-uri',
      'frame-ancestors',
      'form-action',
      'connect-src',
      'script-src',
      'style-src',
    ])
    expect(csp).not.toMatch(/data:|img-src/)
    for (const { file, text } of sources()) {
      expect(text, file).not.toMatch(/<img[^>]*src="https?:/)
      expect(text, file).not.toMatch(/(?:src|srcset|href)="data:image/)
    }
  })

  test('S8.3 FR-012 the slice adds no script: the one module stays the only <script>, and the cards, diagrams and marks ship none', () => {
    const scripts = sources().filter(({ text, file }) => file.endsWith('.astro') && /<script\b/.test(text))
    expect(scripts.map(({ file }) => file)).toEqual(['components/previews/PreviewLink.astro'])
    for (const file of ['components/home/HopperFigure.astro', 'components/share/ShareCard.astro', 'pages/share/[card].astro'])
      expect(readFileSync(path.join(SRC, file), 'utf8'), file).not.toMatch(/<script|\son[a-z]+=/)
  })

  test('S3.7 FR-006 the diagrams add no motion of their own, and draw in the band’s tokens with no inline style', () => {
    // The diagrams' styles are the design system's, so the gallery shows them without the home's stylesheets.
    const css = read('apps', 'site', 'src', 'styles', 'ds', 'components.css')
    const start = css.indexOf("/* ---- The band's diagrams (spec 039, D234) ---- */")
    expect(start).toBeGreaterThan(0)
    const figures = css.slice(start)
    expect(figures).not.toMatch(/transition|animation|@keyframes/)
    expect(figures).toMatch(/var\(--color-band-ink\)/)
    expect(figures).toMatch(/var\(--color-band-accent\)/)
    const component = read('apps', 'site', 'src', 'components', 'home', 'HopperFigure.astro')
    expect(component).not.toMatch(/style=/)
    expect(component).toMatch(/<figure class="hopper__figure" aria-hidden="true"/)
  })
})

describe('the marks and the owners line (story 4)', () => {
  test('S4.3 FR-008 a mark shows only beside the band’s eyebrow, Bleacher Report’s featured card and the gallery', () => {
    const using = sources()
      // The header's GitHub and LinkedIn logos are drawn by Logo.astro, a link's icon, not a company's mark beside its name (D227).
      .filter(({ text }) => /import \{[^}]*\bMARKS\b[^}]*\} from '[^']*\/marks\.ts'|\/marks\//.test(text))
      .map(({ file }) => file)
      .sort()
    expect(using).toEqual([
      'components/home/Experience.astro',
      'components/home/Hopper.astro',
      'components/home/marks.ts',
      'pages/design-system.astro',
    ])
    // Only two companies' marks are in the site's files, and nothing else.
    expect(readdirSync(path.join(SITE, 'public', 'marks')).sort()).toEqual(['bleacher-report.svg', 'hopper.png'])
    expect(Object.keys(MARKS)).toEqual(['hopper', 'bleacher-report'])
    // The timeline's rows carry no mark.
    const experience = read('apps', 'site', 'src', 'components', 'home', 'Experience.astro')
    const timeline = experience.slice(experience.indexOf('<ol class="experience__timeline"'), experience.indexOf('</ol>'))
    expect(timeline).not.toMatch(/<img|MARKS/)
  })

  test('S4.1 S4.2 S4.5 FR-008 each mark is its company’s own file, recorded with where and when it was taken, at 30 and 40 px', async () => {
    expect(MARKS.hopper).toMatchObject({
      src: '/marks/hopper.png',
      width: 223,
      height: 60,
      shown: 30,
      page: 'https://media.hopper.com/press-kit',
    })
    expect(MARKS['bleacher-report']).toMatchObject({
      src: '/marks/bleacher-report.svg',
      width: 1600,
      height: 1200,
      shown: 40,
      page: 'https://bleacherreport.com/',
    })
    expect([shownWidth(MARKS.hopper), shownWidth(MARKS['bleacher-report'])]).toEqual([112, 53])
    const sharp = (await import('sharp')).default
    const hopper = await sharp(path.join(SITE, 'public', 'marks', 'hopper.png')).metadata()
    expect([hopper.format, hopper.width, hopper.height, hopper.hasAlpha]).toEqual(['png', 223, 60, true])
    expect([hopper.exif, hopper.xmp, hopper.icc]).toEqual([undefined, undefined, undefined])
    // B/R's mark is its header's drawing, in its light scheme's colors: one tile and one path, nothing else.
    const br = read('apps', 'site', 'public', 'marks', 'bleacher-report.svg')
    expect(br).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1600 1200"><rect width="1600" height="1200" fill="#1a1a1a"\/><path fill="#fff" d="M484\.85 200H200v800h284\.85/,
    )
    expect(br).not.toMatch(/<script|<style|href=|<image|<text|\son[a-z]+=/)
    const record = read('docs', 'decisions', '0235-two-company-marks-and-an-owners-line.md')
    for (const words of ['https://media.hopper.com/press-kit', 'https://bleacherreport.com/', '2026-11-16', 'changes neither'])
      expect(record, words).toContain(words)
  })

  test('S4.4 FR-008 the home and role pages’ footer says the names and marks belong to their owners, on its own line', () => {
    expect(OWNERS_LINE).toBe('Company names and marks belong to their owners.')
    expect(read('apps', 'site', 'src', 'components', 'home', 'HomePage.astro')).toContain('<Footer built owners={OWNERS_LINE} />')
    expect(read('apps', 'site', 'src', 'components', 'ds', 'Footer.astro')).toContain(
      '{owners && <span class="ds-footer__owners">{owners}</span>}',
    )
    expect(read('apps', 'site', 'src', 'styles', 'ds', 'components.css')).toMatch(/\.ds-footer__owners \{\s+flex-basis: 100%;/)
  })
})

describe('the photo (story 6)', () => {
  test('S6.1 FR-010 the contact section shows the photo round, lazy, with its sizes and alt text naming Brad', () => {
    expect(PHOTO.alt).toBe('Brad Thome')
    expect(PHOTO_SIZES).toEqual([64, 76, 128, 152])
    expect(PHOTO.srcset).toBe('/photo/brad-64.webp 64w, /photo/brad-76.webp 76w, /photo/brad-128.webp 128w, /photo/brad-152.webp 152w')
    expect(PHOTO.sizes).toBe('(max-width: 40rem) 64px, 76px')
    const contact = read('apps', 'site', 'src', 'components', 'home', 'Contact.astro')
    expect(contact).toMatch(/<img\s+class="contact__photo"[\s\S]*?alt=\{PHOTO\.alt\}\s+loading="lazy"/)
    for (const size of PHOTO_SIZES) expect(existsSync(path.join(SITE, 'public', 'photo', `brad-${size}.webp`)), `${size}`).toBe(true)
  })

  test('S6.3 FR-010 the résumé PDFs show no photo, and no share card does', () => {
    for (const file of filesIn(path.join(SRC, 'components', 'resume')).concat(
      path.join(SRC, 'pages', 'resume', '[role].astro'),
      path.join(SRC, 'styles', 'resume', 'print.css'),
    ))
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/PHOTO|\/photo\/|contact__photo/)
    expect(read('apps', 'site', 'src', 'components', 'share', 'ShareCard.astro')).not.toMatch(/PHOTO|\/photo\//)
  })
})

describe('the records (FR-013)', () => {
  test('FR-013 D232 to D237 are recorded and indexed, D164 and D226 note their amendment, and the plan has slice 5.12', () => {
    const records = readdirSync(path.join(ROOT, 'docs', 'decisions'))
    const index = read('docs', 'decisions', 'README.md')
    for (const id of ['0232', '0233', '0234', '0235', '0236', '0237']) {
      const record = records.find((name) => name.startsWith(`${id}-`))
      expect(record, id).toBeDefined()
      expect(read('docs', 'decisions', record ?? ''), id).toMatch(new RegExp(`log-id: D${id.slice(1)}\\n`))
      expect(index, id).toContain(`| [${id}](${record}) |`)
    }
    expect(read('docs', 'decisions', '0164-no-photo-at-v2-0.md')).toContain('Amended in part by [D237]')
    expect(read('docs', 'decisions', '0226-brads-github-avatar-on-the-heros-chip.md')).toContain('Amended in part by [D237]')
    expect(read('docs', 'decisions', '0236-the-bt-site-icon.md')).toMatch(/SIL Open Font License 1\.1/)
    expect(read('docs', 'decisions', '0237-brads-photo-by-get-in-touch.md')).toMatch(/overrides D164's rule/)
    expect(read('docs', 'plan.md')).toMatch(/\| 5\.12 Pictures \|/)
  })
})
