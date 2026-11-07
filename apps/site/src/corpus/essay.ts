// The essay, by section (spec 020, D181). Each level-2 heading starts a
// section, and each section has a fixed ID here, so its ID stays when its
// words change, and a renamed heading keeps its ID by changing its entry. A
// heading with no entry, or an entry with no heading, fails the build. The
// essay's own words go in as written, less the MDX around them: its front
// matter, imports, exports and components, such as the system diagram.

/** Each section's fixed ID, and the heading it starts with. */
export const ESSAY_SECTIONS: Readonly<Record<string, string>> = {
  'essay-summary': 'Summary',
  'essay-product': 'The product and the constraint',
  'essay-system': 'The system at a glance',
  'essay-docs': 'Docs are the operating system',
  'essay-worktrees': 'One agent, one worktree, one port slot',
  'essay-tests': 'Tests first, then a second reader',
  'essay-devices': 'Phones, simulators and a car on the desk',
  'essay-dark-launch': 'New features ship dark',
  'essay-production': 'One door to production',
  'essay-scheduled-agents': 'Agents on a schedule',
  'essay-loop': 'Closing the loop',
  'essay-what-broke': 'What broke and what I changed',
  'essay-advice': "What I'd tell a team adopting this",
}

/** The essay's title, from its front matter. */
export function essayTitleOf(source: string): string {
  const title = /^---\n[\s\S]*?^title:\s*(.+?)\s*$[\s\S]*?\n---\n/m.exec(source)?.[1]
  if (title === undefined) throw new Error("The essay's front matter has no title.")
  return title.replace(/^(['"])(.*)\1$/, '$2')
}

export interface EssaySection {
  id: string
  heading: string
  /** The heading's anchor on the essay page, as Astro writes it. */
  anchor: string
  text: string
}

/** A heading's anchor, as Astro's Markdown writes it (github-slugger): lowercase, punctuation dropped, spaces as hyphens. */
export function anchorOf(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

/** The essay's MDX, with its front matter, and the lines that are MDX rather than words, taken out. */
function wordsOf(source: string): string {
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '')
  let fenced = false
  return body
    .split('\n')
    .filter((line) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
      if (fenced) return true
      return !/^(import|export)\s/.test(line) && !/^\s*<[A-Z][\w.]*[^>]*\/>\s*$/.test(line)
    })
    .join('\n')
}

/** The essay's sections, in order, each with its fixed ID. */
export function sectionsOf(source: string): EssaySection[] {
  const ids = new Map(Object.entries(ESSAY_SECTIONS).map(([id, heading]) => [heading, id]))
  const sections: EssaySection[] = []
  let current: { heading: string; lines: string[] } | undefined
  let fenced = false
  const close = () => {
    if (current === undefined) return
    const id = ids.get(current.heading)
    if (id === undefined) throw new Error(`The essay's section "${current.heading}" has no ID in ESSAY_SECTIONS.`)
    const text = current.lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    if (text === '') throw new Error(`The essay's section "${current.heading}" has no words.`)
    sections.push({ id, heading: current.heading, anchor: anchorOf(current.heading), text })
  }
  for (const line of wordsOf(source).split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    const heading = fenced ? null : /^## (.+?)\s*$/.exec(line)
    if (heading?.[1] !== undefined) {
      close()
      current = { heading: heading[1], lines: [] }
    } else if (current !== undefined) {
      current.lines.push(line)
    } else if (line.trim() !== '') {
      throw new Error('The essay has words before its first section.')
    }
  }
  close()
  const found = new Set(sections.map((section) => section.id))
  for (const [id, heading] of Object.entries(ESSAY_SECTIONS)) {
    if (!found.has(id)) throw new Error(`ESSAY_SECTIONS names "${heading}" (${id}), which no heading in the essay has.`)
  }
  return sections
}
