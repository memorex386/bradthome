import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// The page doesn't change (SC-004). Nothing rendered the collections in this
// slice, so no page, layout or component read them, and the build's output
// stayed the same. Since spec 007, the home page reads one entry, VINDecoded's
// project file, for its name and address. Since spec 010, the new home's hero
// looks up the claims its facts rest on, and since spec 011, the Hopper story
// reads the Hopper claims and job. Since spec 012, the Experience section
// reads the jobs, the claims and the education entry, and since spec 013, the
// side projects section reads the projects, the claims and the jobs. Nothing
// else reads them yet.

const SRC = path.resolve('apps/site/src')

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'content' ? [] : sources(full)
    return /\.(astro|tsx?|jsx?|mdx?)$/.test(entry.name) && entry.name !== 'content.config.ts' ? [full] : []
  })
}

describe('the page', () => {
  test("SC-004 no page, layout or component reads the collections, but the home page's one entry (spec 007), the hero's claims (spec 010), the Hopper story's (spec 011), the Experience section's (spec 012) and the side projects' (spec 013)", () => {
    const files = sources(SRC)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (path.basename(file) === 'index.astro' && path.basename(path.dirname(file)) === 'pages') {
        expect(text.match(/getCollection|getEntry\(/g), file).toEqual(['getEntry('])
        expect(text, file).toContain("getEntry('projects', 'vindecoded')")
      } else if (path.basename(file) === 'Hero.astro' && path.basename(path.dirname(file)) === 'home') {
        expect(text.match(/getCollection|getEntry\([^)]*\)/g), file).toEqual(["getEntry('claims', id)"])
      } else if (path.basename(file) === 'Hopper.astro' && path.basename(path.dirname(file)) === 'home') {
        expect(text.match(/getCollection\([^,)]*|getEntry\([^)]*\)/g), file).toEqual([
          "getEntry('jobs', 'hopper')",
          "getCollection('claims'",
        ])
      } else if (path.basename(file) === 'Experience.astro' && path.basename(path.dirname(file)) === 'home') {
        expect(text.match(/getCollection\([^,)]*|getEntry\([^)]*\)/g), file).toEqual([
          "getCollection('jobs'",
          "getCollection('claims'",
          "getEntry('education', 'education')",
        ])
      } else if (path.basename(file) === 'Side.astro' && path.basename(path.dirname(file)) === 'home') {
        expect(text.match(/getCollection\([^,)]*|getEntry\([^)]*\)/g), file).toEqual([
          "getCollection('projects'",
          "getCollection('claims'",
          "getCollection('jobs'",
        ])
      } else expect(text, file).not.toMatch(/astro:content|getCollection|getEntry/)
    }
  })
})
