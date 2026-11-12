import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { z } from 'astro/zod'

// The content model's schemas (spec 005, D38, D109). content.config.ts, the
// export script and the tests all read this one file, so it imports nothing
// from astro:content and plain Node can load it. Every object is strict, so an
// unknown field fails the build (FR-002).

/** A Windows drive path or a home folder (FR-007). */
const MACHINE_PATH = /[A-Za-z]:\\|\/Users\/|\/home\//

/** Text that can't hold a machine path. */
const text = () =>
  z
    .string()
    .min(1)
    .refine((value) => !MACHINE_PATH.test(value), { message: 'holds a machine path' })

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be a YYYY-MM month')
/** An https link. A backslash or a machine path in it fails too (FR-007). */
const link = z
  .url({ protocol: /^https$/ })
  .refine((value) => !MACHINE_PATH.test(value) && !value.includes('\\'), { message: 'holds a machine path' })
const order = z.int().positive()

/** Each role the entry appears under, with its place there. */
const roles = z.strictObject({ mobile: order.optional(), fullstack: order.optional(), ai: order.optional() })

export const jobSchema = z.strictObject({
  company: text(),
  title: text(),
  start: month,
  end: z.union([month, z.literal('present')]),
  display: z.enum(['story', 'featured', 'card', 'line']),
  roles,
  summary: text().optional(),
})

export const projectSchema = z.strictObject({
  name: text(),
  role: text(),
  display: z.enum(['card', 'small']),
  url: link,
  roles,
  start: month.optional(),
  end: z.union([month, z.literal('present')]).optional(),
})

/** A degree, written by hand like a job (slice 3.4, D130). Its words show through its claim. */
export const educationSchema = z.strictObject({
  school: text(),
  degree: text(),
  year: z.int().min(1900).max(2100),
})

/**
 * A fact about Brad's whole career, such as the years of each kind of work
 * (spec 036), written by hand like a job, so the notes' heading of the same
 * name gives the export a subject. Its words show through its claims.
 */
export const careerSchema = z.strictObject({
  name: text(),
})

export const claimSchema = z.strictObject({
  subject: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  topic: text().optional(),
  order,
  text: text(),
  evidence: z.array(link),
  visibility: z.literal('public'),
})

export type Job = z.infer<typeof jobSchema>
export type Project = z.infer<typeof projectSchema>
export type Education = z.infer<typeof educationSchema>
export type Career = z.infer<typeof careerSchema>
export type Claim = z.infer<typeof claimSchema>

/** A claim whose subject must be one of the given job, project or education IDs (FR-006). */
export function claimSchemaFor(subjects: ReadonlySet<string>) {
  return claimSchema.refine((claim) => subjects.has(claim.subject), { message: 'names no job or project', path: ['subject'] })
}

/** The folders whose files a claim can name as its subject. Spec 036 adds the career's own facts. */
export const SUBJECT_FOLDERS = ['jobs', 'projects', 'education', 'career'] as const

/** The IDs of the job, project and education files in a content folder. A folder that's missing has none. */
export function subjectsIn(contentDir: string): Set<string> {
  const ids = new Set<string>()
  for (const folder of SUBJECT_FOLDERS) {
    const dir = path.join(contentDir, folder)
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.yaml')) ids.add(name.slice(0, -'.yaml'.length))
    }
  }
  return ids
}
