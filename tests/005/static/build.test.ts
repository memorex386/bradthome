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
// side projects section reads the projects, the claims and the jobs. Since
// spec 036, the hero reads the claims, the jobs and the projects for its
// role tiles and their details, and the corpus reads the career's own facts.
// Nothing else reads them yet.

const SRC = path.resolve('apps/site/src')

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'content' ? [] : sources(full)
    return /\.(astro|tsx?|jsx?|mdx?)$/.test(entry.name) && entry.name !== 'content.config.ts' ? [full] : []
  })
}

describe('the page', () => {
  test("SC-004 no page, layout or component reads the collections, but the hero's claims (spec 010), the Hopper story's (spec 011), the Experience section's (spec 012), the side projects' (spec 013), the résumé's print page (spec 015) and the corpus (spec 020)", () => {
    const files = sources(SRC)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (path.basename(file) === 'Hero.astro' && path.basename(path.dirname(file)) === 'home') {
        // Spec 036: the role tiles and their details read the claims, the jobs and the projects.
        expect(text.match(/getCollection\([^,)]*|getEntry\([^)]*\)/g), file).toEqual([
          "getCollection('claims'",
          "getCollection('jobs'",
          "getCollection('projects'",
        ])
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
        // Amended by spec 038 (D229): the receipts' numbers are gone, so the side projects no longer read the jobs to number on from Experience's.
        expect(text.match(/getCollection\([^,)]*|getEntry\([^)]*\)/g), file).toEqual(["getCollection('projects'", "getCollection('claims'"])
      } else if (path.basename(file) === '[role].astro' && path.basename(path.dirname(file)) === 'resume') {
        // The résumé PDFs' print page (spec 015) reads what the role page reads.
        expect(text.match(/getCollection\([^,)]*|getEntry\([^)]*\)/g), file).toEqual([
          "getCollection('jobs'",
          "getCollection('projects'",
          "getCollection('claims'",
        ])
      } else if (path.basename(file) === 'data.ts' && path.basename(path.dirname(file)) === 'previews') {
        // The link previews' data (spec 016): their snapshots and hand-written
        // cards, and the job and project files their rows name.
        expect(text.match(/getCollection\([^,)]*|getEntry\([^)]*\)/g), file).toEqual([
          "getCollection('previewSnapshots'",
          "getCollection('previewCards'",
          "getCollection('jobs'",
          "getCollection('projects'",
        ])
      } else if (path.basename(file) === 'build.ts' && path.basename(path.dirname(file)) === 'corpus') {
        // The chat's corpus (spec 020): every job, project, career fact (spec 036) and claim, for /corpus.json and /llms.txt.
        expect(text.match(/getCollection\([^,)]*|getEntry\([^)]*\)/g), file).toEqual([
          "getCollection('jobs'",
          "getCollection('projects'",
          "getCollection('career'",
          "getCollection('claims'",
        ])
      } else expect(text, file).not.toMatch(/astro:content|getCollection|getEntry/)
    }
  })
})
