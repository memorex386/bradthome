// The résumé PDFs' words and structure (spec 015). Each role gets one PDF, and
// it prints exactly the claims the role's page shows, in the page's order
// (D6, D134): the Hopper story with the role's topic order, the Experience
// section's jobs and lines, the side projects and the degree. Every sentence
// is a public claim's text, less any rule for the site, or comes from a job or
// project file or the contact line (D137). This file adds only headings and
// labels, and it reuses the sections' own builders, so the PDF and the page
// can't drift apart.

import { byNewest, cardsOf as experienceCardsOf, datesOf, lineDatesOf, type ExperienceJob } from '../home/experience.ts'
import { EMAIL, MAILTO } from '../ds/contact.ts'
import { EYEBROW, PLACE } from '../home/hero.ts'
import { monthOf, storyOf, type StoryClaim } from '../home/hopper.ts'
import type { Role } from '../home/hero.ts'
import { PAGES, ROLES, topicOrderOf, type RolePage } from '../home/roles.ts'
import { blocksOf, cardsOf as sideCardsOf, hostOf, onPaper, type Block, type SideProject } from '../home/side.ts'

export { ROLES }

/** The name at the top of every PDF. */
export const NAME = 'Brad Thome'

/** The contact line: Brad's choice of 11/5 (D137). No phone number, ever. */
export const CONTACT: readonly { label: string; href?: string }[] = [
  { label: PLACE },
  { label: EMAIL, href: MAILTO },
  { label: 'bradthome.com', href: 'https://bradthome.com' },
  { label: 'linkedin.com/in/brad-thome', href: 'https://www.linkedin.com/in/brad-thome/' },
  { label: 'github.com/memorex386', href: 'https://github.com/memorex386' },
]

/** The sections' headings, in the page's order. */
export const HEADINGS = { experience: 'Experience', side: 'On the side', education: 'Education' } as const

/** Where each role's PDF is served, and the file name a download keeps (D140). */
export const FILES: Readonly<Record<RolePage, string>> = {
  mobile: 'brad-thome-mobile.pdf',
  fullstack: 'brad-thome-full-stack.pdf',
  ai: 'brad-thome-applied-ai.pdf',
}

/** The folder the PDFs are served from. */
export const FOLDER = 'resume'

/** A role's PDF, as a path on the site. */
export const pdfHrefOf = (role: RolePage): string => `/${FOLDER}/${FILES[role]}`

/** The PDF the home's "Read the résumé" opens, Brad's choice (D141). */
export const HOME_RESUME: RolePage = 'fullstack'

/** The PDF a page's "Read the résumé" opens: its role's, or the home's choice (D6, D141). */
export const resumeHrefOf = (role: Role): string => pdfHrefOf(role === 'all' ? HOME_RESUME : role)

/** The page the build prints each PDF from, as Astro writes it in dist. */
export const sourceOf = (role: RolePage): string => `${FOLDER}/${role}.html`

/** The PDF's title, which a reader shows in place of its file name. */
export const titleOf = (role: RolePage): string => `${PAGES[role].title} · Résumé`

/** A bullet: a claim's words as blocks, so a claim with a list keeps it. */
export interface Bullet {
  id: string
  blocks: Block[]
}

/** A group of bullets under a label, such as one of Hopper's topics. */
export interface Group {
  label?: string
  bullets: Bullet[]
}

/** A job or project: its name, its role there, its dates, a lead line, and its bullets. */
export interface Entry {
  id: string
  name: string
  href?: string
  role: string
  /** The claims whose words the heading carries, such as "remote" (issue #45). */
  headed: string[]
  dates: string
  lead: Bullet[]
  groups: Group[]
}

/** A dated line: a job the page shows only as its line, or the degree. */
export interface Line {
  id: string
  dates: string
  text: string
}

export interface Resume {
  role: RolePage
  title: string
  name: string
  headline: string
  contact: typeof CONTACT
  experience: Entry[]
  side: Entry[]
  education: Line[]
}

/** The content the résumé reads: the same collections the page reads. */
export interface ResumeContent {
  jobs: readonly ExperienceJob[]
  projects: readonly SideProject[]
  claims: readonly (StoryClaim & { subject: string })[]
}

const bullet = (id: string, text: string): Bullet => ({ id, blocks: blocksOf(text) })

/**
 * A claim that opens with the job's title, such as "Senior Android Developer,
 * promoted from Android Developer in Dec 2020.": the words after the title,
 * capitalized, or the claim's text when it doesn't open with the title. The
 * heading already names the title, so it prints once (issue #45).
 */
export function afterTitle(text: string, title: string): { text: string; restated: boolean } {
  const opening = `${title},`
  if (!text.startsWith(opening)) return { text, restated: false }
  const rest = text.slice(opening.length).trim()
  return { text: `${rest.charAt(0).toUpperCase()}${rest.slice(1)}`, restated: true }
}

/**
 * A job's heading and bullets, without repeating its title. A claim that
 * restates the title and adds one word, such as "remote.", lends that word to
 * the heading ("Senior Software Engineer · Remote"); one that adds more prints
 * what it adds as a bullet.
 */
function untitled(title: string, items: readonly { id: string; text: string }[]): { role: string; headed: string[]; bullets: Bullet[] } {
  const words: string[] = []
  const headed: string[] = []
  const bullets: Bullet[] = []
  for (const item of items) {
    const { text, restated } = afterTitle(item.text, title)
    const word = text.replace(/\.$/, '')
    if (restated && word !== '' && !/\s/.test(word)) {
      words.push(word)
      headed.push(item.id)
    } else if (text !== '') bullets.push(bullet(item.id, text))
  }
  return { role: [title, ...words].join(' · '), headed, bullets }
}

/**
 * The résumé for one role. Experience lists every job newest first by start
 * date (D142): Hopper with its role lines as the lead and its topics in the
 * role's order (D134), the featured job and the cards with the claims their
 * looks show, and the jobs the page shows as one dated line as a heading
 * alone. Then the side projects as their cards show them, then the degree. A
 * claim the page needs and can't find throws, as it does on the page.
 */
export function resumeOf(role: RolePage, content: ResumeContent): Resume {
  const { jobs, projects, claims } = content
  const hopperJob = jobs.find((job) => job.id === 'hopper')
  if (!hopperJob) throw new Error('The résumé needs content/jobs/hopper.yaml.')
  const story = storyOf(
    claims.filter((claim) => claim.subject === 'hopper'),
    topicOrderOf(role),
  )
  if (story.role.length === 0) throw new Error('The résumé needs the Hopper role claims.')
  const hopperLead = untitled(hopperJob.title, story.role)
  const hopper: Entry = {
    id: 'hopper',
    name: hopperJob.company,
    role: hopperLead.role,
    headed: hopperLead.headed,
    dates: datesOf(hopperJob),
    lead: hopperLead.bullets,
    // The topics, then any pull quotes, where the page puts them (spec 011); none is public yet.
    groups: [
      ...story.topics.map((topic) => ({ label: topic.title, bullets: topic.items.map((item) => bullet(item.id, item.text)) })),
      ...(story.quotes.length > 0 ? [{ bullets: story.quotes.map((item) => bullet(item.id, item.text)) }] : []),
    ],
  }

  const { featured, cards } = experienceCardsOf(jobs, claims, 1)
  const looked = new Map([...featured, ...cards].map((card) => [card.job.id, card]))
  const experience: Entry[] = byNewest(jobs).map((job): Entry => {
    if (job.id === 'hopper') return hopper
    const card = looked.get(job.id)
    if (!card) return { id: job.id, name: job.company, role: job.title, headed: [], dates: lineDatesOf(job), lead: [], groups: [] }
    const { role: heading, headed, bullets } = untitled(job.title, card.items)
    return { id: job.id, name: job.company, role: heading, headed, dates: datesOf(job), lead: [], groups: [{ bullets }] }
  })

  // bradthome.com stays off paper: the contact line links it, and its counts are dated by the build (spec 033).
  const side: Entry[] = sideCardsOf(onPaper(projects), claims, 1).map(({ project, items }) => ({
    id: project.id,
    name: project.name,
    href: project.url,
    role: project.role,
    headed: [],
    dates: project.start === undefined ? hostOf(project.url) : `${monthOf(project.start)} – ${monthOf(project.end ?? 'present')}`,
    lead: [],
    groups: [{ bullets: items.map((item) => bullet(item.id, item.text)) }],
  }))

  const degree = claims.find((claim) => claim.subject === 'education')
  if (!degree) throw new Error('The résumé needs the education claim.')
  // The claim names the school, the degree and the year, so the line is the claim alone.
  const education: Line[] = [{ id: degree.id, dates: '', text: degree.text }]

  return {
    role,
    title: titleOf(role),
    name: NAME,
    headline: EYEBROW[role],
    contact: CONTACT,
    experience,
    side,
    education,
  }
}

/** Every claim ID a résumé prints, in reading order. */
export function claimIdsOf(resume: Resume): string[] {
  const ofEntry = (entry: Entry) => [
    ...entry.headed,
    ...[...entry.lead, ...entry.groups.flatMap((group) => group.bullets)].map((item) => item.id),
  ]
  return [...resume.experience.flatMap(ofEntry), ...resume.side.flatMap(ofEntry), ...resume.education.map((line) => line.id)]
}
