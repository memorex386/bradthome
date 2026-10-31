import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { git, type GitOptions, splitZ } from './git.ts'

// The copies that keep every agent on the same instructions (FR-014, D75).
// Each skill in .agents/skills has a copy in .claude/skills, and the spec and
// plan templates have copies in Spec Kit's override folder. Spec Kit writes
// its own speckit-* skills for each agent, so those aren't copies.

export const SKILLS = '.agents/skills'
export const SKILL_COPIES = '.claude/skills'
export const TEMPLATES = [
  { source: 'docs/templates/spec.md', copy: '.specify/templates/overrides/spec-template.md' },
  { source: 'docs/templates/plan.md', copy: '.specify/templates/overrides/plan-template.md' },
] as const

const SPEC_KIT = /^speckit-/

export interface CopyProblem {
  copy: string
  /** The copy's source, or undefined for a stale copy that has none. */
  source: string | undefined
}

function skillOf(file: string, base: string): string | undefined {
  if (!file.startsWith(`${base}/`)) return undefined
  const name = file.slice(base.length + 1).split('/')[0]
  return name === undefined || SPEC_KIT.test(name) ? undefined : name
}

/** The copies that don't match their sources, given each file's content or blob ID. */
export function copyProblems(files: ReadonlyMap<string, string>): CopyProblem[] {
  const skills: CopyProblem[] = []
  for (const [file, content] of files) {
    if (skillOf(file, SKILLS) !== undefined) {
      const copy = `${SKILL_COPIES}${file.slice(SKILLS.length)}`
      if (files.get(copy) !== content) skills.push({ copy, source: file })
    } else if (skillOf(file, SKILL_COPIES) !== undefined) {
      const source = `${SKILLS}${file.slice(SKILL_COPIES.length)}`
      if (!files.has(source)) skills.push({ copy: file, source: undefined })
    }
  }
  skills.sort((a, b) => (a.copy < b.copy ? -1 : a.copy > b.copy ? 1 : 0))
  const templates = TEMPLATES.filter(({ source, copy }) => files.has(source) && files.get(copy) !== files.get(source))
  return [...skills, ...templates.map(({ source, copy }) => ({ copy, source }))]
}

/** The copies that don't match, as staged: blob IDs in the index. */
export function stagedCopyProblems(options: GitOptions): CopyProblem[] {
  const paths = [SKILLS, SKILL_COPIES, ...TEMPLATES.flatMap(({ source, copy }) => [source, copy])]
  const blobs = new Map<string, string>()
  for (const entry of splitZ(git(['ls-files', '--stage', '-z', '--', ...paths], options))) {
    const tab = entry.indexOf('\t')
    blobs.set(entry.slice(tab + 1), entry.slice(0, tab).split(' ')[1] ?? '')
  }
  return copyProblems(blobs)
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
}

function foldersIn(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => !SPEC_KIT.test(name) && statSync(path.join(dir, name)).isDirectory())
}

function copyFile(from: string, to: string, written: string[], label: string): void {
  const bytes = readFileSync(from)
  if (existsSync(to) && readFileSync(to).equals(bytes)) return
  mkdirSync(path.dirname(to), { recursive: true })
  writeFileSync(to, bytes)
  written.push(label)
}

/** Brings every copy in line with its source, in the working tree. */
export function syncCopies(root: string): { written: string[]; removed: string[] } {
  const written: string[] = []
  const removed: string[] = []
  const sources = path.join(root, SKILLS)
  const copies = path.join(root, SKILL_COPIES)
  const skills = new Set(foldersIn(sources))
  for (const skill of skills) {
    const from = path.join(sources, skill)
    const to = path.join(copies, skill)
    const files = new Set(filesUnder(from))
    for (const file of files) copyFile(path.join(from, file), path.join(to, file), written, `${SKILL_COPIES}/${skill}/${file}`)
    for (const file of filesUnder(to)) {
      if (files.has(file)) continue
      rmSync(path.join(to, file), { force: true })
      removed.push(`${SKILL_COPIES}/${skill}/${file}`)
    }
    removeEmptyFolders(to)
  }
  for (const skill of foldersIn(copies)) {
    if (skills.has(skill)) continue
    rmSync(path.join(copies, skill), { recursive: true, force: true })
    removed.push(`${SKILL_COPIES}/${skill}/`)
  }
  for (const { source, copy } of TEMPLATES) {
    if (existsSync(path.join(root, source))) copyFile(path.join(root, source), path.join(root, copy), written, copy)
  }
  return { written, removed }
}

function removeEmptyFolders(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const inner = path.join(dir, entry.name)
    removeEmptyFolders(inner)
    if (readdirSync(inner).length === 0) rmSync(inner, { recursive: true, force: true })
  }
}
