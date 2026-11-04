import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parse } from 'yaml'
import { jobSchema, projectSchema } from '../../../apps/site/src/content/schema.ts'

// The seeded jobs and projects against the positioning (S3.1–S3.4, FR-016,
// D2, D8, D67, D109).

const CONTENT = path.resolve('apps/site/content')
const ROLES = ['mobile', 'fullstack', 'ai'] as const

function entries<T>(folder: string, schema: { parse(value: unknown): T }): Map<string, T> {
  const dir = path.join(CONTENT, folder)
  return new Map(
    readdirSync(dir)
      .filter((name) => name.endsWith('.yaml'))
      .map((name) => [name.replace(/\.yaml$/, ''), schema.parse(parse(readFileSync(path.join(dir, name), 'utf8')))]),
  )
}

const jobs = entries('jobs', jobSchema)
const projects = entries('projects', projectSchema)

describe('the seeded jobs', () => {
  test('S3.1 FR-016 Hopper is the only story, April 2022 to October 2026, first for every role', () => {
    const hopper = jobs.get('hopper')
    expect(hopper).toMatchObject({ company: 'Hopper', display: 'story', start: '2022-04', end: '2026-10' })
    expect([...jobs.values()].filter((job) => job.display === 'story')).toHaveLength(1)
    for (const role of ROLES) expect(hopper?.roles[role]).toBe(1)
  })

  test('FR-016 Hopper ends on one line of one file', () => {
    const text = readFileSync(path.join(CONTENT, 'jobs', 'hopper.yaml'), 'utf8')
    expect(text.split('\n').filter((line) => line.startsWith('end:'))).toHaveLength(1)
  })

  test('S3.3 FR-016 gives each earlier role its space', () => {
    expect(jobs.get('bleacher-report')?.display).toBe('featured')
    expect(jobs.get('bottle-rocket')?.display).toBe('card')
    expect(jobs.get('bookshout')?.display).toBe('card')
    expect(jobs.get('realpage')).toMatchObject({ display: 'line', start: '2018-04', end: '2019-09' })
    const enterprise = jobs.get('enterprise-it')
    expect(enterprise).toMatchObject({ display: 'line', start: '2008-11', end: '2015-10', summary: 'enterprise IT, 2008–2015' })
    expect(enterprise?.company).toContain('Harley-Davidson')
    expect(enterprise?.company).toContain('Infosys')
    expect([...jobs.keys()].sort()).toEqual(['bleacher-report', 'bookshout', 'bottle-rocket', 'enterprise-it', 'hopper', 'realpage'])
  })
})

describe('the seeded projects', () => {
  test('S3.2 FR-016 VINDecoded is a side-project card and Sudoku World a small card, and neither is a job', () => {
    expect(projects.get('vindecoded')).toMatchObject({ name: 'VINDecoded', display: 'card', url: 'https://vindecoded.com' })
    expect(projects.get('sudoku-world')).toMatchObject({ name: 'Sudoku World', display: 'small', url: 'https://sudokuworld.app' })
    expect([...projects.keys()].sort()).toEqual(['sudoku-world', 'vindecoded'])
    for (const id of projects.keys()) expect(jobs.has(id)).toBe(false)
  })
})

describe('role orders', () => {
  test('S3.4 FR-016 each entry orders every role it appears under, and no two of a kind share an order', () => {
    for (const kind of [jobs, projects]) {
      for (const role of ROLES) {
        const orders = [...kind.values()].map((entry) => entry.roles[role]).filter((order) => order !== undefined)
        expect(new Set(orders).size).toBe(orders.length)
      }
      for (const entry of kind.values()) expect(Object.keys(entry.roles).length).toBeGreaterThan(0)
    }
  })
})
