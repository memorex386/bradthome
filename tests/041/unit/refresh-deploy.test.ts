import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { pulseSnapshotSchema } from '../../../apps/site/src/content/previews.ts'
import { pulseText } from '../../../scripts/previews/refresh-lib.ts'

// Spec 041, Story 5: the card's built numbers live in their own file. Amended
// by spec 044 (D247): the pulse's GitHub secrets (S4.9) and the weekly
// refresh through the deployed API (S5.1, S5.2) are gone, so their tests
// retired; spec 044's tests cover the deploy with no pulse secret and the
// refresh run by hand on Brad's PC.

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), 'utf8')

describe('the built numbers', () => {
  test("S3.8 S5.1 the committed pulse file is the refresh's own text, and the App Store snapshots don't carry it", () => {
    const text = read('apps', 'site', 'content', 'previews', 'pulse.json')
    const pulse = pulseSnapshotSchema.parse(JSON.parse(text))
    expect(pulseText(pulse)).toBe(text)
    expect(read('apps', 'site', 'content', 'previews', 'snapshots.json')).not.toMatch(/"version"|"released"/)
  })
})
