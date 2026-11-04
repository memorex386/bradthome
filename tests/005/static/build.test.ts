import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// The page doesn't change (SC-004). Nothing renders the collections yet, so no
// page, layout or component reads them, and the build's output stays the same.

const SRC = path.resolve('apps/site/src')

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'content' ? [] : sources(full)
    return /\.(astro|tsx?|jsx?|mdx?)$/.test(entry.name) && entry.name !== 'content.config.ts' ? [full] : []
  })
}

describe('the page', () => {
  test('SC-004 no page, layout or component reads the collections yet', () => {
    const files = sources(SRC)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/astro:content|getCollection|getEntry/)
  })
})
