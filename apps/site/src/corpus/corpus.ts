import { z } from 'astro/zod'
import { claimSchema } from '../content/schema.ts'
import { EMAIL } from '../components/ds/contact.ts'
import { anchorOf, cardsOf as experienceCardsOf, type ExperienceJob, lineDatesOf } from '../components/home/experience.ts'
import { monthOf, storyOf, type StoryClaim } from '../components/home/hopper.ts'
import { cardsOf as sideCardsOf, type SideProject } from '../components/home/side.ts'
import { type EssaySection, sectionsOf } from './essay.ts'

// The corpus that "Ask about Brad" reads (spec 020, D174): every public claim,
// the jobs' and projects' titles and dates, and the essay by section (D181),
// each a source with an ID that doesn't change when its words do, and a link
// to the page and anchor where it shows. /corpus.json and /llms.txt are both
// built from corpusOf at build time. Like the home's modules, this file
// imports nothing from Astro's content layer, so plain Node and the tests load it.

/** The JSON's shape. A change that would break a reader bumps it. */
export const CORPUS_VERSION = 1

/** The site every link points at: the corpus names the live pages, wherever it's built. */
export const SITE = 'https://bradthome.com'

export const ESSAY_PATH = '/vindecoded-agents'

/** Who the corpus is about, as the home page's description says it. */
export const ABOUT =
  'Brad Thome, a senior mobile and full-stack engineer in Dallas–Fort Worth, builds Android, iOS and web products end to end.'

/** Brad's address, from the one place the site writes it (spec 017). */
export const CONTACT = EMAIL

/**
 * A claim's closing sentence that is a note to the site, not a fact for a
 * reader (specs 012 and 013). The corpus cuts it, and the build fails when a
 * claim stops ending with its note, so a re-exported claim is read again.
 */
export const SITE_NOTES: Readonly<Record<string, string>> = {
  'bookshout-1': "Brad calls it the risk-taker's move to a startup.",
  'realpage-1': 'The site shows only this dated line.',
  'vindecoded-7': 'Never say the 1,235 PRs all went through the newer workflow.',
}

/**
 * Words that mark a sentence as a note to the site. A claim that holds one and
 * has no entry in SITE_NOTES fails the build, so a new note from a later
 * export never reaches the corpus unread.
 */
const NOTE_WORDS = /\b(the site|this site|never say|don'?t say|do not say|never show|don'?t show|do not show)\b/i

export type SourceKind = 'claim' | 'job' | 'project' | 'essay'

export interface Source {
  /** Stable: a claim's ID, `job-` or `project-` and its file's name, or the essay section's fixed ID. */
  id: string
  kind: SourceKind
  /** How the chat names it: "Résumé · Hopper" or "Essay · New features ship dark". */
  label: string
  text: string
  /** The page and anchor on bradthome.com where it shows. */
  url: string
  /** The public pages that back a claim. */
  evidence: string[]
}

export interface Corpus {
  version: number
  name: string
  about: string
  site: string
  contact: string
  /** The essay's sources are Brad's own words, in the first person: its "I" is Brad. */
  essay: { title: string; url: string; author: string }
  sources: Source[]
}

/** The corpus's shape, strict, as spec 020's tables give it. The build checks its own output against it (FR-006). */
const sourceSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum(['claim', 'job', 'project', 'essay']),
  label: z.string().regex(/^(Résumé|Essay) · .+/),
  text: z.string().min(1),
  url: z.url({ protocol: /^https$/ }).startsWith('https://bradthome.com/'),
  evidence: z.array(z.url({ protocol: /^https$/ })),
})
export const corpusSchema = z.strictObject({
  version: z.literal(1),
  name: z.literal('Brad Thome'),
  about: z.string().min(1),
  site: z.literal('https://bradthome.com'),
  contact: z.literal(EMAIL),
  essay: z.strictObject({
    title: z.string().min(1),
    url: z.literal('https://bradthome.com/vindecoded-agents'),
    author: z.literal('Brad Thome'),
  }),
  sources: z.array(sourceSchema).min(1),
})

export interface CorpusInput {
  jobs: readonly ExperienceJob[]
  projects: readonly SideProject[]
  claims: readonly (StoryClaim & { subject: string; visibility: string })[]
  essay: { title: string; source: string }
}

/** A claim's words for a reader: its text, less any note to the site. */
export function factOf(id: string, text: string): string {
  const note = SITE_NOTES[id]
  let fact = text.trimEnd()
  if (note !== undefined) {
    if (!fact.endsWith(note))
      throw new Error(`The claim ${id} no longer ends with its note to the site. Read it again, then update SITE_NOTES.`)
    fact = fact.slice(0, -note.length).trimEnd()
  }
  // What's left is checked too, so a second note beside a listed one never gets in.
  if (NOTE_WORDS.test(fact)) throw new Error(`The claim ${id} reads like a note to the site. Add its note to SITE_NOTES, or reword it.`)
  return fact
}

/** The IDs of the claims that carry a receipt on the home page, as its sections number them. */
function receiptsOf(input: CorpusInput): Set<string> {
  const claims = input.claims
  const hopper = storyOf(claims.filter((claim) => claim.subject === 'hopper'))
  const hopperItems = [...hopper.role, ...hopper.topics.flatMap((topic) => topic.items), ...hopper.quotes]
  const experience = experienceCardsOf(input.jobs, claims, hopperItems.length + 1)
  const experienceItems = [...experience.featured, ...experience.cards].flatMap((card) => card.items)
  const side = sideCardsOf(input.projects, claims, hopperItems.length + experienceItems.length + 1)
  return new Set([...hopperItems, ...experienceItems, ...side.flatMap((card) => card.items)].map((item) => item.id))
}

const slugOf = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Where a claim shows on the home: its receipt, or else its job's, project's or topic's place. */
function claimAnchor(
  claim: CorpusInput['claims'][number],
  receipts: ReadonlySet<string>,
  projects: ReadonlySet<string>,
  hopperTopics: ReadonlySet<string>,
): string {
  if (receipts.has(claim.id)) return `#receipt-${claim.id}`
  if (claim.subject === 'education') return '#experience-education'
  if (projects.has(claim.subject)) return `#side-${claim.subject}`
  if (claim.subject === 'hopper')
    return claim.topic !== undefined && hopperTopics.has(claim.topic) ? `#hopper-${slugOf(claim.topic)}` : '#hopper'
  return anchorOf(claim.subject)
}

/** Builds the corpus. It throws, failing the build, on a claim that isn't public or a note it can't cut. */
export function corpusOf(input: CorpusInput): Corpus {
  for (const claim of input.claims) {
    const { id, subject, visibility, ...rest } = claim
    const parsed = claimSchema.safeParse({ subject, visibility, ...rest, evidence: [...claim.evidence] })
    if (!parsed.success || visibility !== 'public') throw new Error(`The corpus takes public claims only, and ${id} isn't one.`)
  }

  const names = new Map<string, string>([
    ...input.jobs.map((job): [string, string] => [job.id, job.company]),
    ...input.projects.map((project): [string, string] => [project.id, project.name]),
    ['education', 'Education'],
  ])
  const receipts = receiptsOf(input)
  const projectIds = new Set(input.projects.map((project) => project.id))
  const hopperTopics = new Set(storyOf(input.claims.filter((claim) => claim.subject === 'hopper')).topics.map((topic) => topic.name))

  const claims = [...input.claims]
    .sort((a, b) => a.subject.localeCompare(b.subject) || a.order - b.order)
    .map((claim): Source => {
      const name = names.get(claim.subject)
      if (name === undefined) throw new Error(`The claim ${claim.id} names ${claim.subject}, which isn't a job, project or the degree.`)
      return {
        id: claim.id,
        kind: 'claim',
        label: claim.topic === undefined ? `Résumé · ${name}` : `Résumé · ${name}, ${claim.topic}`,
        text: factOf(claim.id, claim.text),
        url: `${SITE}/${claimAnchor(claim, receipts, projectIds, hopperTopics)}`,
        evidence: [...claim.evidence],
      }
    })

  const jobs = [...input.jobs]
    .sort((a, b) => b.start.localeCompare(a.start))
    .map((job): Source => ({
      id: `job-${job.id}`,
      kind: 'job',
      label: `Résumé · ${job.company}`,
      text: `${job.title} at ${job.company}, ${lineDatesOf(job)}.`,
      url: `${SITE}/${anchorOf(job.id)}`,
      evidence: [],
    }))

  const projects = [...input.projects]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((project): Source => ({
      id: `project-${project.id}`,
      kind: 'project',
      label: `Résumé · ${project.name}`,
      text: `${project.role} of ${project.name}, a side project${project.start === undefined ? '' : ` since ${monthOf(project.start)}`}. Its site is ${project.url}.`,
      url: `${SITE}/#side-${project.id}`,
      evidence: [project.url],
    }))

  const essay = sectionsOf(input.essay.source).map((section: EssaySection): Source => ({
    id: section.id,
    kind: 'essay',
    label: `Essay · ${section.heading}`,
    text: section.text,
    url: `${SITE}${ESSAY_PATH}#${section.anchor}`,
    evidence: [],
  }))

  const sources = [...jobs, ...projects, ...claims, ...essay]
  const seen = new Set<string>()
  for (const source of sources) {
    if (seen.has(source.id)) throw new Error(`Two sources share the ID ${source.id}.`)
    seen.add(source.id)
  }
  return corpusSchema.parse({
    version: CORPUS_VERSION,
    name: 'Brad Thome',
    about: ABOUT,
    site: SITE,
    contact: CONTACT,
    essay: { title: input.essay.title, url: `${SITE}${ESSAY_PATH}`, author: 'Brad Thome' },
    sources,
  })
}

/** The corpus as JSON, two-space indented, with a closing newline. */
export function jsonOf(corpus: Corpus): string {
  return `${JSON.stringify(corpus, null, 2)}\n`
}

/** One line of text: line breaks become spaces, so a source fits one llms.txt list item. */
const oneLine = (text: string): string => text.replace(/\s*\n\s*/g, ' ').trim()

/**
 * The corpus as llms.txt, in llmstxt.org's format (D180): the name as the H1,
 * a one-line summary as the blockquote, a paragraph on how to cite, then an H2
 * per kind, each source a list item linking its page, with its ID and its
 * text inline.
 */
export function llmsOf(corpus: Corpus): string {
  const item = (source: Source) => `- [${source.label}](${source.url}): ID \`${source.id}\`. ${oneLine(source.text)}`
  const of = (...kinds: SourceKind[]) => corpus.sources.filter((source) => kinds.includes(source.kind)).map(item)
  return [
    `# ${corpus.name}`,
    '',
    `> ${corpus.about}`,
    '',
    `Every item below is a public fact about Brad from ${corpus.site}, with a stable ID and a link to where it shows. Cite the ID and the link. The essay is Brad's own, in the first person, so its "I" is Brad. Anything not here is not a public fact about Brad: ask Brad at ${corpus.contact}.`,
    '',
    '## Résumé',
    '',
    ...of('job', 'project', 'claim'),
    '',
    `## Essay: ${corpus.essay.title}`,
    '',
    ...of('essay'),
    '',
    '## Optional',
    '',
    `- [The corpus as JSON](${corpus.site}/corpus.json): the same sources, with each claim's evidence links.`,
    '',
  ].join('\n')
}
