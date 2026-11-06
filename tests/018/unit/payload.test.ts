import { describe, expect, test } from 'vitest'
import { payloadOf, referrerOf, resumeRoleOf, shouldSend } from '../../../apps/site/src/components/analytics/payload.ts'
import { WEBSITE_ID } from '../../../apps/site/src/components/analytics/umami.ts'

// The sender's pure parts (FR-001–FR-003, S2.1, S2.3, S3.2): the gate, and
// exactly what each body holds.

const PAGE = {
  href: 'https://bradthome.com/mobile?utm_source=x&id=7#hopper',
  referrer: 'https://www.linkedin.com/feed/update/123?trk=abc',
  title: 'Brad Thome · Mobile engineer',
  language: 'en-US',
  screen: { width: 390, height: 844 },
}

describe('the gate', () => {
  test('S2.1 FR-002 SC-002 D156 sends only when the host is exactly bradthome.com', () => {
    expect(shouldSend({ hostname: 'bradthome.com' })).toBe(true)
    for (const hostname of ['127.0.0.1', 'localhost', 'bradthome--pr-50-abc.web.app', 'bradthome--next-xyz.web.app', 'www.bradthome.com', 'bradthome.com.evil.test', 'bradthome.web.app'])
      expect(shouldSend({ hostname }), hostname).toBe(false)
  })

  test('S2.3 FR-002 D157 Do Not Track or Global Privacy Control turns it off', () => {
    expect(shouldSend({ hostname: 'bradthome.com', doNotTrack: '1' })).toBe(false)
    expect(shouldSend({ hostname: 'bradthome.com', doNotTrack: 'yes' })).toBe(false)
    expect(shouldSend({ hostname: 'bradthome.com', globalPrivacyControl: true })).toBe(false)
    expect(shouldSend({ hostname: 'bradthome.com', doNotTrack: '0', globalPrivacyControl: false })).toBe(true)
    expect(shouldSend({ hostname: 'bradthome.com', doNotTrack: null })).toBe(true)
  })
})

describe('the body', () => {
  test('S1.1 S3.2 FR-003 a page view holds exactly the seven fields, with the path only and the referrer as its origin', () => {
    expect(payloadOf(PAGE)).toEqual({
      website: WEBSITE_ID,
      hostname: 'bradthome.com',
      url: '/mobile',
      referrer: 'https://www.linkedin.com',
      title: 'Brad Thome · Mobile engineer',
      language: 'en-US',
      screen: '390x844',
    })
  })

  test('S1.4 S1.5 S3.2 FR-001 an event adds its name, and its one property only when it has one', () => {
    expect(Object.keys(payloadOf(PAGE, 'work-reached')).sort()).toEqual(['hostname', 'language', 'name', 'referrer', 'screen', 'title', 'url', 'website'])
    expect(payloadOf(PAGE, 'resume-download', { role: 'mobile' })).toMatchObject({ name: 'resume-download', data: { role: 'mobile' } })
    expect(payloadOf(PAGE, 'contact-click', { method: 'copy' }).data).toEqual({ method: 'copy' })
  })

  test("S3.2 FR-003 the referrer is empty for this site's own pages, none, or anything that isn't a web page", () => {
    for (const referrer of ['', 'https://bradthome.com/v2', 'not a url', 'android-app://com.linkedin.android/'])
      expect(referrerOf(referrer, PAGE.href), referrer).toBe('')
    expect(referrerOf('https://www.google.com/search?q=brad', PAGE.href)).toBe('https://www.google.com')
  })
})

describe('the résumé links', () => {
  test("S1.4 FR-001 a link to one of spec 015's PDFs gives its role, and any other link none", () => {
    const base = 'https://bradthome.com/v2'
    expect(resumeRoleOf('/resume/brad-thome-mobile.pdf', base)).toBe('mobile')
    expect(resumeRoleOf('/resume/brad-thome-full-stack.pdf', base)).toBe('fullstack')
    expect(resumeRoleOf('https://bradthome.com/resume/brad-thome-applied-ai.pdf', base)).toBe('ai')
    for (const href of ['/resume/other.pdf', '/resume/mobile.html', 'https://example.com/resume/brad-thome-mobile.pdf', '#contact', 'mailto:brad@bradthome.com'])
      expect(resumeRoleOf(href, base), href).toBeUndefined()
  })
})
