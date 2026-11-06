import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { COPIED_FOR, COPY, EMAIL, MAILTO } from '../../../apps/site/src/components/ds/contact.ts'
import { HEADING, linksOf } from '../../../apps/site/src/components/home/contact.ts'
import { RECEIPT } from '../../../apps/site/src/components/home/hopper.ts'
import { CONTACT } from '../../../apps/site/src/components/resume/resume.ts'

// The contact's source (Story 3, S4.2, S4.3, FR-001, FR-006, FR-007, FR-009):
// one address, written once; one component; the copy code inside the one
// module; nothing private; and the docs.

const ROOT = path.join(import.meta.dirname, '..', '..', '..')
const SRC = path.join(ROOT, 'apps/site/src')
const read = (file: string): string => readFileSync(path.join(ROOT, file), 'utf8')

function filesIn(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = path.join(folder, name)
    return statSync(full).isDirectory() ? filesIn(full) : [full]
  })
}

const SOURCES = filesIn(SRC)
  .filter((file) => /\.(astro|ts|tsx|css|mdx?)$/.test(file))
  .map((file) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'), text: readFileSync(file, 'utf8') }))

// A North American phone number, written any common way.
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/

describe('one address', () => {
  test('S3.4 FR-001 contact.ts holds the address, its mail link and the button\'s words', () => {
    expect(EMAIL).toBe('brad@bradthome.com')
    expect(MAILTO).toBe('mailto:brad@bradthome.com')
    expect(COPY).toEqual({
      rest: 'Copy address',
      copied: 'Copied',
      selected: 'Address selected',
      copiedNote: 'Copied brad@bradthome.com to the clipboard.',
      selectedNote: "Couldn't copy here, so the address is selected. Copy it with your keyboard or the menu.",
    })
    expect(COPIED_FOR).toBe(2000)
  })

  test('S3.4 FR-006 the address is written once, in contact.ts, and every phase 3 file takes it from there', () => {
    const writers = SOURCES.filter(({ text }) => text.includes('brad@bradthome.com')).map(({ file }) => file)
    expect(writers).toEqual(['apps/site/src/components/ds/contact.ts'])
    expect(CONTACT).toContainEqual({ label: EMAIL, href: MAILTO })
  })

  test('S3.1 FR-006 no source shows another address or a phone number', () => {
    for (const { file, text } of SOURCES) {
      const addresses = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? []
      // Package specifiers such as @fontsource-variable/inter aren't addresses; each found one must be Brad's.
      for (const address of addresses) expect(address, file).toBe('brad@bradthome.com')
      expect(text.match(PHONE)?.[0], file).toBeUndefined()
    }
  })
})

describe('the component and its places', () => {
  const email = read('apps/site/src/components/ds/Email.astro')

  test('S2.1 S2.4 FR-001 Email.astro renders the mail link, the button, its three labels in one cell and a polite status', () => {
    expect(email).toContain('href={MAILTO}')
    expect(email).toContain('type="button"')
    expect(email).toContain('role="status"')
    expect(email).toMatch(/data-label="rest"[\s\S]*data-label="copied"[\s\S]*data-label="selected"/)
    const css = read('apps/site/src/styles/ds/components.css')
    expect(css).toMatch(/\.ds-email__label \{\s*grid-area: 1 \/ 1;\s*visibility: hidden;/)
    expect(css).toMatch(/@media \(scripting: none\) \{\s*\.ds-email__copy \{\s*display: none;/)
  })

  test('S1.1 S1.3 S2.1 FR-002 FR-003 the hero, the header\'s sections and the closing section use it', () => {
    const hero = read('apps/site/src/components/home/Hero.astro')
    expect(hero).toMatch(/hero__resume"[\s\S]*<Email quiet class="hero__resume" \/>/)
    const home = read('apps/site/src/components/home/HomePage.astro')
    expect(home).toContain("{ label: 'Contact', href: '#contact' }")
    expect(home).toMatch(/<Side \/>\s*<Contact role=\{role\} \/>\s*<\/main>/)
    const section = read('apps/site/src/components/home/Contact.astro')
    expect(section).toContain('id="contact"')
    expect(section).toContain('<Email />')
    expect(HEADING).toBe('Get in touch')
    expect(linksOf('all')).toEqual([
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/brad-thome/' },
      { label: 'GitHub', href: 'https://github.com/memorex386' },
      { label: 'Résumé PDF', href: '/resume/brad-thome-full-stack.pdf', pdf: true },
    ])
    expect(linksOf('mobile')[2]?.href).toBe('/resume/brad-thome-mobile.pdf')
  })

  test('S3.2 S3.3 FR-005 the ask-me receipts and the gallery\'s placeholders go to #contact, and no source links mailto: but contact.ts', () => {
    expect(RECEIPT.askHref).toBe('#contact')
    const gallery = read('apps/site/src/pages/design-system.astro')
    expect(gallery).toMatch(/<AskButton href="#contact"/)
    expect(gallery).not.toContain('mailto:')
    for (const { file, text } of SOURCES) if (file !== 'apps/site/src/components/ds/contact.ts') expect(text, file).not.toContain('mailto:')
  })
})

describe('the script', () => {
  const script = read('apps/site/src/components/ds/email.client.ts')

  test('S4.2 FR-007 D154 the copy code is imported by the one module in PreviewLink.astro, and no other file has a script', () => {
    const link = read('apps/site/src/components/previews/PreviewLink.astro')
    expect(link).toMatch(/<script>[\s\S]*import '\.\/previews\.client\.ts'[\s\S]*import '\.\.\/ds\/email\.client\.ts'[\s\S]*<\/script>/)
    for (const { file, text } of SOURCES) {
      if (file.endsWith('PreviewLink.astro')) continue
      expect(text.toLowerCase().includes('<script'), file).toBe(false)
    }
  })

  test('S2.2 S2.3 S4.1 FR-004 FR-007 it copies with the Clipboard API, selects on refusal, and fetches nothing', () => {
    expect(script).toContain('navigator.clipboard')
    expect(script).toContain('writeText(EMAIL)')
    expect(script).toContain('selectAllChildren(address)')
    expect(script).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|execCommand/)
  })

  test('S4.2 FR-007 the Content-Security-Policy allows scripts from self and hashes only, with no other host', () => {
    const csp = (JSON.parse(read('firebase.json')) as { hosting: { headers: { headers: { key: string; value: string }[] }[] } }).hosting.headers
      .flatMap((block) => block.headers)
      .find((header) => header.key === 'Content-Security-Policy')?.value
    const scriptSrc = csp?.split(';').find((part) => part.trim().startsWith('script-src')) ?? ''
    for (const source of scriptSrc.trim().split(/\s+/).slice(1)) expect(source).toMatch(/^('self'|'sha256-[\w+/=]+')$/)
  })

  test('S4.3 only the home, the role pages and the gallery show the contact, all live since v2.0 (spec 019)', () => {
    const users = SOURCES.filter(({ text }) => /import (Email|Contact) from/.test(text)).map(({ file }) => file)
    expect(users.sort()).toEqual([
      'apps/site/src/components/home/Contact.astro',
      'apps/site/src/components/home/Hero.astro',
      'apps/site/src/components/home/HomePage.astro',
      'apps/site/src/pages/design-system.astro',
    ])
  })
})

describe('the docs', () => {
  test('FR-009 D152–D154 are recorded and indexed, and the plan marks slice 3.9', () => {
    const index = read('docs/decisions/README.md')
    for (const record of [
      '0152-contact-shows-in-the-hero-and-closes-each-page.md',
      '0153-ask-me-links-go-to-the-contact-section.md',
      '0154-the-copy-button-runs-in-the-sites-one-module.md',
    ]) {
      expect(read(`docs/decisions/${record}`)).toMatch(/log-id: D15[234]/)
      expect(index).toContain(record)
    }
    expect(read('docs/plan.md')).toMatch(/\| 3\.9 Contact \|[^\n]*spec 017/)
  })
})
