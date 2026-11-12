import { existsSync, readdirSync } from 'node:fs'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'
import { CASES } from '../../../apps/evals/src/cases.ts'
import { loadCorpus } from '../../../apps/evals/src/corpus.ts'
import { ACTIONS, DETAILS, PICK, resumeLabelOf, TILES, workLabelOf } from '../../../apps/site/src/components/home/hero.ts'
import { monthOf } from '../../../apps/site/src/components/home/hopper.ts'
import { hrefOf, ROLES } from '../../../apps/site/src/components/home/roles.ts'
import { GITHUB, LINKEDIN } from '../../../apps/site/src/components/ds/profiles.ts'
import { SUBJECT_FOLDERS } from '../../../apps/site/src/content/schema.ts'
import { motionBlocks, read, repoPath, rules, sitePath } from '../../010/helpers/hero.ts'

// Spec 036's static checks: the tiles' words and links, every fact against
// its public claims, the start months, the years claims and their subject,
// the corpus's links, the eval cases, the one module's import, the motion's
// place in the stylesheet, the header's inline marks and the morph's names.

interface Claim {
  subject: string
  text: string
  visibility: string
  topic?: string
}

const FILES = {
  hero: sitePath('src', 'components', 'home', 'Hero.astro'),
  detail: sitePath('src', 'components', 'home', 'HeroDetail.astro'),
  heroCss: sitePath('src', 'styles', 'home', 'hero.css'),
  morphCss: sitePath('src', 'styles', 'home', 'morph.css'),
  header: sitePath('src', 'components', 'ds', 'Header.astro'),
  email: sitePath('src', 'components', 'ds', 'Email.astro'),
  logo: sitePath('src', 'components', 'ds', 'Logo.astro'),
  components: sitePath('src', 'styles', 'ds', 'components.css'),
  preview: sitePath('src', 'components', 'previews', 'PreviewLink.astro'),
  yearsClient: sitePath('src', 'components', 'home', 'years.client.ts'),
  years: sitePath('src', 'components', 'home', 'years.ts'),
  roles: sitePath('src', 'components', 'home', 'roles.ts'),
  page: sitePath('src', 'components', 'home', 'HomePage.astro'),
  resume: sitePath('src', 'components', 'resume', 'resume.ts'),
  claims: sitePath('content', 'claims.yaml'),
  career: sitePath('content', 'career'),
  plan: repoPath('docs', 'plan.md'),
  decisions: repoPath('docs', 'decisions'),
}

const claims = (): Record<string, Claim> => parse(read(FILES.claims)) as Record<string, Claim>

/** The stylesheet less every block that needs motion allowed, alone or with hover, and those blocks' bodies. */
function motionOf(source: string): { still: string; blocks: string[] } {
  const open = /@media[^{]*prefers-reduced-motion\s*:\s*no-preference[^{]*\{/g
  let still = ''
  let from = 0
  const blocks: string[] = []
  for (let match = open.exec(source); match !== null; match = open.exec(source)) {
    if (match.index < from) continue
    let depth = 1
    let at = match.index + match[0].length
    while (at < source.length && depth > 0) {
      if (source[at] === '{') depth += 1
      if (source[at] === '}') depth -= 1
      at += 1
    }
    still += source.slice(from, match.index)
    blocks.push(source.slice(match.index + match[0].length, at - 1))
    from = at
  }
  return { still: still + source.slice(from), blocks }
}

/** Brad's words for the two years claims, from his Gate 1 cards (2026-11-12). */
const APPROVED = {
  'years-of-experience-1':
    "Mobile apps since May 2015: Android Developer at Bottle Rocket from Oct 2015, then BookShout, RealPage, Bleacher Report and Hopper, with VINDecoded's native Android app on the side from May 2015.",
  'years-of-experience-2':
    'Web front ends and the services behind them since Sep 2016: first on the side, moving VINDecoded from native Android to a web app, then at Hopper.',
} as const

/** A fact's claims' texts and subjects, lowercased, each claim checked present and public. */
function textsOf(fact: { label: string; claims: readonly string[] }): string[] {
  const all = claims()
  return fact.claims.map((id) => {
    const claim = all[id]
    expect(claim, `${fact.label}: ${id}`).toBeDefined()
    expect(claim?.visibility, `${fact.label}: ${id}`).toBe('public')
    return `${claim?.text ?? ''} ${claim?.subject ?? ''}`.toLowerCase()
  })
}

describe('the tiles are the switch (story 1)', () => {
  test('S1.1 FR-001 the question, the hint and three tiles, Mobile, Full-stack and Applied AI, each linking its role page', () => {
    expect(PICK).toEqual({
      ask: 'What are you hiring for?',
      hint: 'Pick one to tailor the page',
      all: 'Show all roles',
      go: 'Tailor the page',
    })
    expect(TILES.map((tile) => tile.name)).toEqual(['Mobile', 'Full-stack', 'Applied AI'])
    expect(TILES.map((tile) => tile.role)).toEqual([...ROLES])
    expect(TILES.map((tile) => hrefOf(tile.role))).toEqual(['/mobile', '/fullstack', '/ai'])
    const hero = read(FILES.hero)
    expect(hero).toMatch(/<h2 class="hero__ask" id="pick-label">\s*\{PICK\.ask\}\s*<\/h2>/)
    expect(hero).toMatch(/<nav class="hero__roles" aria-labelledby="pick-label">/)
    expect(hero).toMatch(/href=\{hrefOf\(tile\.role\)\}\s*aria-current=\{on \? 'page' : undefined\}/)
  })

  test('S1.2 FR-001 a role page marks its own tile and links "Show all roles" home; the home shows the hint', () => {
    const hero = read(FILES.hero)
    expect(hero).toMatch(/const on = tile\.role === role/)
    expect(hero).toMatch(/<a class="hero__all" href=\{HOME_HREF\}>[\s\S]*?\{PICK\.all\}\s*<\/a>/)
    expect(hero).toMatch(/<p class="hero__hint">\{PICK\.hint\}<\/p>/)
  })

  test('S1.3 SC-002 FR-001 no "Tailor this page" line, no role switch and no proof tiles in the hero (D223)', () => {
    const hero = read(FILES.hero)
    expect(hero).not.toMatch(/RoleSwitch|Tailor this page|PROOF|hero__proof/)
    expect(read(FILES.roles)).not.toMatch(/Tailor this page/)
    expect(read(sitePath('src', 'components', 'home', 'hero.ts'))).not.toMatch(/\bPROOF\b/)
  })

  test("S1.7 the morph slides the picked tile's check and relights each tile in place (spec 029, D212)", () => {
    const morph = read(FILES.morphCss)
    expect(morph).toMatch(/\.hero__tile\[aria-current='page'\] \.hero__tile-mark \{\s*view-transition-name: role-pill;/)
    for (const n of [1, 2, 3]) expect(morph).toMatch(new RegExp(`\\.hero__tile--${n} \\{\\s*view-transition-name: role-name-${n};`))
    expect(morph).not.toMatch(/ds-roles/)
  })
})

describe('the years (story 2)', () => {
  test("S2.5 FR-003 each counting tile's first claim says its start month, and the build checks it", () => {
    const all = claims()
    const counting = TILES.filter((tile) => tile.since !== undefined)
    expect(counting.map((tile) => [tile.role, tile.since, tile.claims[0]])).toEqual([
      ['mobile', '2015-05', 'years-of-experience-1'],
      ['fullstack', '2016-09', 'years-of-experience-2'],
    ])
    for (const tile of counting) {
      expect(all[tile.claims[0] ?? '']?.text, tile.name).toContain(monthOf(tile.since ?? ''))
      expect(tile.terms, tile.name).toContain(monthOf(tile.since ?? ''))
      expect(tile.label, tile.name).toContain(`since ${monthOf(tile.since ?? '')}`)
    }
    expect(TILES.find((tile) => tile.role === 'ai')).toMatchObject({ figure: 'Founding', label: "engineer on Hopper's Fintech AI team" })
    expect(read(FILES.hero)).toMatch(/\.includes\(monthOf\(tile\.since\)\)\)\s*throw new Error/)
  })

  test('S2.2 FR-002 the build writes each count with its start month in data-since', () => {
    const hero = read(FILES.hero)
    expect(hero).toMatch(
      /<span class="hero__years" data-since=\{tile\.since\}>\s*\{figureOf\(builtYears\(tile\.since, day\)\)\}\s*<\/span>/,
    )
    expect(read(FILES.detail)).toMatch(/<span data-since=\{tile\.since\}>\{figureOf\(builtYears\(tile\.since, day\)\)\}<\/span>/)
  })

  test('S2.6 FR-010 SC-003 the one module counts again, with no scroll handler and no fetch', () => {
    expect(read(FILES.preview)).toMatch(/import '\.\.\/home\/years\.client\.ts'/)
    const client = read(FILES.yearsClient) + read(FILES.years)
    expect(client).toMatch(/recount\(document\.querySelectorAll<HTMLElement>\('\[data-since\]'\), new Date\(\)\)/)
    expect(client).not.toMatch(/addEventListener|fetch\(|scroll/)
  })
})

describe('the detail (story 3)', () => {
  test('S3.2 S3.3 FR-004 each role has a team line, its jobs or its words, three receipts and a question', () => {
    expect(DETAILS.mobile.jobs).toEqual(['bottle-rocket', 'bookshout', 'realpage', 'bleacher-report', 'hopper'])
    expect(DETAILS.mobile.side).toEqual({ id: 'vindecoded', since: '2015-05', label: 'VINDecoded, on the side' })
    expect(DETAILS.fullstack.jobs).toEqual(['hopper'])
    expect(DETAILS.fullstack.side).toEqual({ id: 'vindecoded', since: '2016-09', label: 'VINDecoded, on the side' })
    expect(DETAILS.ai.jobs).toEqual([])
    expect(DETAILS.ai.side).toBeUndefined()
    expect(DETAILS.ai.where).toBeDefined()
    const all = claims()
    for (const role of ROLES) {
      const detail = DETAILS[role]
      expect(detail.receipts, role).toHaveLength(3)
      for (const id of detail.receipts) expect(all[id]?.visibility, `${role}: ${id}`).toBe('public')
      // A side project's line starts where the role's tile starts counting.
      if (detail.side) expect(detail.side.since).toBe(TILES.find((tile) => tile.role === role)?.since)
    }
    expect(DETAILS.mobile.ask).toBe('What has Brad built on mobile?')
    expect(DETAILS.fullstack.ask).toBe('What has Brad built across the stack?')
    expect(DETAILS.ai.ask).toBe('What AI work has Brad shipped?')
  })

  test('S3.4 FR-004 "Ask about this" is a link to the contact section that carries its question, and the work button its role', () => {
    const detail = read(FILES.detail)
    expect(detail).toMatch(/<a class="ds-button ds-button--secondary hero__detail-ask" href="#contact" data-chat-ask=\{detail\.ask\}>/)
    expect(detail).toMatch(/<a class="ds-button ds-button--secondary hero__detail-work" href="#hopper">\s*\{workLabelOf\(role\)\}/)
    expect(workLabelOf('all')).toBe('See the work at Hopper')
    expect(['mobile', 'fullstack', 'ai'].map((role) => workLabelOf(role as 'mobile'))).toEqual([
      'See the mobile work at Hopper',
      'See the full-stack work at Hopper',
      'See the AI work at Hopper',
    ])
  })

  test('S3.5 FR-003 every tile line, team line and "Where it comes from" names public claims that hold each of its terms', () => {
    const facts = [...TILES, ...ROLES.flatMap((role) => [DETAILS[role].team, ...(DETAILS[role].where ? [DETAILS[role].where] : [])])]
    expect(facts).toHaveLength(7)
    for (const fact of facts) {
      expect(fact.claims.length, fact.label).toBeGreaterThan(0)
      expect(fact.terms.length, fact.label).toBeGreaterThan(0)
      const texts = textsOf(fact)
      for (const term of fact.terms)
        expect(
          texts.some((text) => text.includes(term.toLowerCase())),
          `${fact.label}: ${term}`,
        ).toBe(true)
    }
  })

  test('S3.5 FR-003 a missing claim in a tile, a team line or a receipt stops the build', () => {
    const hero = read(FILES.hero)
    expect(hero).toMatch(/needs the public claim \$\{id\} in content\/claims\.yaml/)
    expect(hero).toMatch(/shows the public claim \$\{id\}, which content\/claims\.yaml doesn't hold/)
  })
})

describe('hover and focus (story 4)', () => {
  test('S4.1 S4.2 FR-005 a tile lights its word and rows on hover and on focus, as MA-5 does', () => {
    const css = read(FILES.heroCss)
    for (const n of [1, 2, 3]) {
      expect(css).toMatch(new RegExp(`\\.hero:has\\(\\.hero__word--${n}:hover, \\.hero__row--${n}:hover, \\.hero__tile--${n}:hover\\)`))
      expect(css).toMatch(new RegExp(`\\.hero:has\\(\\.hero__tile--${n}:focus-visible\\)`))
    }
    expect(css).toMatch(/\.hero__tile:hover \.hero__bar-sweep \{\s*scale: 1 1;/)
    expect(css).toMatch(/\.hero__tile:focus-visible \.hero__bar-sweep \{\s*scale: 1 1;/)
  })

  test('S4.3 FR-005 every transition, translate and animation sits in a no-preference block (D122)', () => {
    const { still, blocks } = motionOf(read(FILES.heroCss))
    expect(still).not.toMatch(/\b(transition|animation)\s*:/)
    expect(still).not.toMatch(/\btranslate\s*:\s*(-?\d|0 -?\d)/)
    const motion = blocks.join('\n')
    expect(motion).toMatch(/\.hero__tile:hover \{\s*translate: 0 -2px;/)
    expect(motion).toMatch(/\.hero__tile:focus-visible \{\s*translate: 0 -2px;/)
    expect(motion).toMatch(/\.hero__bar-sweep \{\s*transition: scale 650ms/)
  })

  test('S8.4 FR-005 the tiles rise at 1,000 ms, and the buttons and chips at 1,060 ms, each over 540 ms', () => {
    const motion = motionBlocks(read(FILES.heroCss)).blocks.join('\n')
    const ruleOf = (selector: string) => rules(motion).filter((rule) => rule.selectors.includes(selector))
    expect(ruleOf('.hero__pick').some((rule) => /animation-delay: 1000ms/.test(rule.body))).toBe(true)
    for (const selector of ['.hero__actions', '.hero__profiles'])
      expect(
        ruleOf(selector).some((rule) => /animation-delay: 1060ms/.test(rule.body)),
        selector,
      ).toBe(true)
    expect(motion).toMatch(/\.hero__line,\s*\.hero__pick,\s*\.hero__actions,\s*\.hero__profiles \{\s*animation: hero-rise 540ms/)
  })
})

describe('the buttons and the chips (story 5)', () => {
  test('S5.1 FR-006 the buttons: the work with a down arrow, the résumé with a PDF tag naming the role, and the address', () => {
    expect(ACTIONS).toEqual({ work: { href: '#hopper' }, resume: { label: 'Résumé', tag: 'PDF' } })
    expect(['all', 'mobile', 'fullstack', 'ai'].map((role) => resumeLabelOf(role as 'all'))).toEqual([
      'Résumé',
      'Mobile résumé',
      'Full-stack résumé',
      'Applied AI résumé',
    ])
    const hero = read(FILES.hero)
    expect(hero).toMatch(/hero__work" href=\{ACTIONS\.work\.href\}>\s*\{workLabelOf\(role\)\}\s*<Icon name="down" \/>/)
    expect(hero).toMatch(/hero__resume" href=\{resumeHrefOf\(role\)\} type="application\/pdf">\s*<Icon name="doc" \/>/)
    // The buttons come after the tiles (Brad's Gate 1 card).
    expect(hero.indexOf('class="hero__pick"')).toBeLessThan(hero.indexOf('class="hero__actions"'))
    expect(hero.indexOf('class="hero__actions"')).toBeLessThan(hero.indexOf('class="hero__profiles"'))
  })

  test("S5.2 S5.3 FR-006 the address is the contact component's split look, with its copy code, and reads Email on a phone (D225)", () => {
    expect(read(FILES.hero)).toMatch(/<Email split class="hero__email" \/>/)
    const email = read(FILES.email)
    expect(email).toMatch(/<div class:list=\{\['ds-email-split', className\]\} data-email data-state=\{state\} data-demo=\{demo\}>/)
    expect(email).toMatch(
      /<span class="ds-email-split__word">\{EMAIL_WORD\}<\/span>\s*<span class="ds-email-split__address" data-email-address>/,
    )
    expect(email).toMatch(/data-email-copy\s*aria-label=\{COPY\.rest\}/)
    expect(email).toMatch(/role="status" data-email-status/)
    const css = read(FILES.components)
    expect(css).toMatch(/@media \(scripting: none\) \{\s*\.ds-email-split__copy \{\s*display: none;/)
    expect(css).toMatch(/@media \(max-width: 40rem\) \{[\s\S]*?\.ds-email-split__address \{\s*position: absolute;/)
  })

  test("S5.4 S5.5 FR-007 GitHub's chip shows the snapshot's avatar and LinkedIn's its inline logo, each with its preview card (D226)", () => {
    const hero = read(FILES.hero)
    expect(hero).toMatch(/const github = cardOf\(GITHUB\.href, await previewData\(\)\)/)
    expect(hero).toMatch(/<PreviewLink class="hero__profile" href=\{GITHUB\.href\} place="hero">[\s\S]*?<img src=\{github\.image\}/)
    expect(hero).toMatch(/<PreviewLink class="hero__profile" href=\{LINKEDIN\.href\} place="hero">[\s\S]*?<Logo name="linkedin" \/>/)
    expect(GITHUB).toEqual({ key: 'github', label: 'GitHub', handle: '@memorex386', href: 'https://github.com/memorex386' })
    expect(LINKEDIN).toEqual({
      key: 'linkedin',
      label: 'LinkedIn',
      handle: 'in/brad-thome',
      href: 'https://www.linkedin.com/in/brad-thome/',
    })
  })
})

describe('the header (story 6)', () => {
  test('S6.1 S6.2 S6.5 FR-008 one set of icons: GitHub and LinkedIn as inline marks with names, the résumé with its tag, then the menu of sections', () => {
    const header = read(FILES.header)
    expect(header).toMatch(/href=\{GITHUB\.href\} place="header" label=\{GITHUB\.label\}>\s*<Logo name="github" \/>/)
    expect(header).toMatch(/href=\{LINKEDIN\.href\} place="header" label=\{LINKEDIN\.label\}>\s*<Logo name="linkedin" \/>/)
    expect(header).toMatch(/<span class="ds-header__resume-label">\{resume\.label\}<\/span>\s*<span class="ds-header__tag">PDF<\/span>/)
    expect(header).not.toMatch(/ds-header__phone|place="menu"/)
    const menu = /<nav class="ds-header__menu-panel"[\s\S]*?<\/nav>/.exec(header)?.[0] ?? ''
    expect(menu).toMatch(/sections\.map/)
    expect(menu).not.toMatch(/PreviewLink|GITHUB|LINKEDIN/)
    const logo = read(FILES.logo)
    expect(logo).toMatch(/<svg[^>]*aria-hidden="true" fill="currentColor">\s*<path d=\{mark\.path\}><\/path>/)
    expect(logo).not.toMatch(/https?:\/\/|<img/)
  })

  test('S6.1 FR-008 on a phone the sections fold into the menu and the icons stay, 44 px each, touching under 360 px', () => {
    const css = read(FILES.components)
    expect(css).toMatch(
      /@media \(max-width: 40rem\) \{[\s\S]*?\.ds-header__sections \{\s*display: none;[\s\S]*?\.ds-header__menu \{\s*display: block;/,
    )
    expect(css).toMatch(/\.ds-header__resume \{\s*flex-direction: column;\s*gap: 1px;\s*width: 2\.75rem;/)
    expect(css).toMatch(/@media \(max-width: 22\.5rem\) \{\s*\.ds-header__end,\s*\.ds-header__profiles \{\s*gap: 0;/)
  })

  test("S6.3 S6.4 the home and role pages pass their PDF to the header, and over the band its icons take the band's colors", () => {
    expect(read(FILES.page)).toMatch(
      /<Header sections=\{sections\} resume=\{\{ label: ACTIONS\.resume\.label, href: resumeHrefOf\(role\) \}\} sticky \/>/,
    )
    expect(read(FILES.components)).toMatch(
      /\.ds-header--sticky\[data-band\] \.ds-header__menu > summary,\s*\.ds-header--sticky\[data-band\] \.ds-header__icon,\s*\.ds-header--sticky\[data-band\] \.ds-header__resume \{/,
    )
  })
})

describe('the claims and the chat (story 7)', () => {
  test("S7.1 FR-011 the years claims hold Brad's approved words, with their start months and no count, under the career's own subject", () => {
    const all = claims()
    for (const [id, text] of Object.entries(APPROVED)) {
      expect(all[id], id).toMatchObject({ subject: 'years-of-experience', text, visibility: 'public' })
      expect(text, id).not.toMatch(/\d+\+|\b\d+ years\b/)
    }
    // The mobile claim leads with the jobs: VINDecoded comes last, on the side.
    const mobile = APPROVED['years-of-experience-1']
    expect(mobile.indexOf('Bottle Rocket')).toBeLessThan(mobile.indexOf('VINDecoded'))
    expect(mobile).toMatch(/VINDecoded's native Android app on the side/)
    expect(SUBJECT_FOLDERS).toContain('career')
    expect(readdirSync(FILES.career)).toEqual(['years-of-experience.yaml'])
    expect(parse(read(`${FILES.career}/years-of-experience.yaml`))).toEqual({ name: 'Years of experience' })
  })

  test('S7.2 FR-011 each years claim is a corpus source linking its tile on the home', () => {
    const sources = new Map(loadCorpus().sources.map((source) => [source.id, source]))
    expect(sources.get('years-of-experience-1')).toMatchObject({
      label: 'Résumé · Years of experience',
      text: APPROVED['years-of-experience-1'],
      url: 'https://bradthome.com/#tile-mobile',
    })
    expect(sources.get('years-of-experience-2')).toMatchObject({
      label: 'Résumé · Years of experience',
      text: APPROVED['years-of-experience-2'],
      url: 'https://bradthome.com/#tile-fullstack',
    })
  })

  test('S7.3 FR-011 each "Ask about this" question is a facts case that must cite one of its role\'s claims', () => {
    const corpus = new Set(loadCorpus().sources.map((source) => source.id))
    for (const role of ROLES) {
      const found = CASES.find((entry) => entry.id === `facts-tile-${role}`)
      expect(found, role).toMatchObject({ suite: 'facts', question: DETAILS[role].ask, expect: { states: ['answered'] } })
      const cites = found?.expect.cites ?? []
      expect(cites.length, role).toBeGreaterThan(0)
      for (const cite of cites) expect(corpus.has(cite), `${role}: ${cite}`).toBe(true)
      for (const receipt of DETAILS[role].receipts) expect(cites, `${role}: ${receipt}`).toContain(receipt)
    }
  })
})

describe('it still works for everyone (story 8)', () => {
  test('S8.3 FR-010 no inline style or script, and no address on another host, in the hero, its detail or the header', () => {
    for (const file of [FILES.hero, FILES.detail, FILES.header, FILES.logo]) {
      const source = read(file)
      expect(source, file).not.toMatch(/\sstyle=|<script|set:html/)
      expect(source, file).not.toMatch(/src="https?:/)
    }
  })

  test("S8.6 the résumé PDFs read no career fact, so their words don't change", () => {
    expect(read(FILES.resume)).not.toMatch(/career|years-of-experience/)
  })

  test('FR-012 the plan holds slice 5.10, and the decision log holds D223–D227', () => {
    expect(read(FILES.plan)).toMatch(/\| 5\.10 The hero's tiles and buttons \|/)
    const names = readdirSync(FILES.decisions)
    for (const n of [223, 224, 225, 226, 227])
      expect(
        names.some((name) => name.startsWith(`0${n}-`)),
        `D${n}`,
      ).toBe(true)
    expect(existsSync(repoPath('docs', 'decisions', 'README.md'))).toBe(true)
    const index = read(repoPath('docs', 'decisions', 'README.md'))
    for (const n of [223, 224, 225, 226, 227])
      expect(index, `D${n}`).toMatch(new RegExp(`\\| \\[0${n}\\]\\(0${n}-[a-z0-9-]+\\.md\\) \\| .+ \\| 2026-11-12 \\| Accepted \\|`))
    expect(index).toMatch(/\| \[0205\]\(0205-[a-z-]+\.md\) \| .+ \| Superseded by D223 \|/)
  })
})
