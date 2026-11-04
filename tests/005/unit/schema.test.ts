import { describe, expect, test } from 'vitest'
import { claimSchema, claimSchemaFor, jobSchema, projectSchema } from '../../../apps/site/src/content/schema.ts'

// The schemas the build and the export share (S2.1–S2.4, FR-002–FR-007).
// Each planted entry differs from a valid one by one fault.

const job = {
  company: 'Example Co',
  title: 'Engineer',
  start: '2020-01',
  end: 'present',
  display: 'story',
  roles: { mobile: 1, fullstack: 2 },
}
const project = { name: 'Widget App', role: 'Builder', display: 'small', url: 'https://widget.example', roles: { ai: 1 } }
const claim = { subject: 'example-co', order: 1, text: 'Built it.', evidence: ['https://example.com'], visibility: 'public' }

const ok = (schema: { safeParse(value: unknown): { success: boolean } }, value: unknown) => schema.safeParse(value).success

describe('valid entries', () => {
  test('FR-003 FR-004 FR-005 accept a job, a project and a claim with their fields', () => {
    expect(ok(jobSchema, job)).toBe(true)
    expect(ok(jobSchema, { ...job, end: '2024-06', summary: 'one line' })).toBe(true)
    expect(ok(projectSchema, project)).toBe(true)
    expect(ok(projectSchema, { ...project, start: '2015-05', end: 'present' })).toBe(true)
    expect(ok(claimSchema, claim)).toBe(true)
    expect(ok(claimSchema, { ...claim, topic: 'Platform', evidence: [] })).toBe(true)
  })
})

describe('planted faults', () => {
  test('S2.1 FR-002 rejects a field the schema does not name, in each collection and in roles', () => {
    expect(ok(jobSchema, { ...job, location: 'Remote' })).toBe(false)
    expect(ok(jobSchema, { ...job, roles: { ...job.roles, design: 3 } })).toBe(false)
    expect(ok(projectSchema, { ...project, stars: 5 })).toBe(false)
    expect(ok(claimSchema, { ...claim, source: 'résumé' })).toBe(false)
  })

  test('S2.2 FR-005 rejects a claim marked interview or private, or with no mark', () => {
    expect(ok(claimSchema, { ...claim, visibility: 'interview' })).toBe(false)
    expect(ok(claimSchema, { ...claim, visibility: 'private' })).toBe(false)
    const { visibility: _visibility, ...unmarked } = claim
    expect(ok(claimSchema, unmarked)).toBe(false)
  })

  test('S2.3 FR-006 rejects a claim whose subject is neither a job nor a project', () => {
    const schema = claimSchemaFor(new Set(['example-co', 'widget-app']))
    expect(ok(schema, claim)).toBe(true)
    expect(ok(schema, { ...claim, subject: 'widget-app' })).toBe(true)
    expect(ok(schema, { ...claim, subject: 'nowhere' })).toBe(false)
  })

  test('S2.4 FR-007 rejects a machine path in any text', () => {
    expect(ok(claimSchema, { ...claim, text: String.raw`Kept in C:\Users\someone\notes.` })).toBe(false)
    expect(ok(claimSchema, { ...claim, text: 'Kept in /Users/someone/notes.' })).toBe(false)
    expect(ok(claimSchema, { ...claim, topic: 'From /home/someone' })).toBe(false)
    expect(ok(jobSchema, { ...job, summary: String.raw`d:\work` })).toBe(false)
    expect(ok(projectSchema, { ...project, role: 'Owner of /home/x' })).toBe(false)
    expect(ok(claimSchema, { ...claim, evidence: [String.raw`https://example.com/C:\Users\someone\notes`] })).toBe(false)
    expect(ok(projectSchema, { ...project, url: 'https://example.com/home/someone/x' })).toBe(false)
  })

  test('FR-003 FR-004 rejects a month that is not YYYY-MM, a display it does not know, and a link that is not https', () => {
    expect(ok(jobSchema, { ...job, start: 'Jan 2020' })).toBe(false)
    expect(ok(jobSchema, { ...job, start: '2020-13' })).toBe(false)
    expect(ok(jobSchema, { ...job, display: 'small' })).toBe(false)
    expect(ok(projectSchema, { ...project, display: 'story' })).toBe(false)
    expect(ok(projectSchema, { ...project, url: 'http://widget.example' })).toBe(false)
    expect(ok(claimSchema, { ...claim, evidence: ['http://example.com'] })).toBe(false)
    expect(ok(jobSchema, { ...job, roles: { mobile: 0 } })).toBe(false)
  })
})
