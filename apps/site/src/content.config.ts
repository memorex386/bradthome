import { fileURLToPath } from 'node:url'
import { defineCollection } from 'astro:content'
import { file, glob } from 'astro/loaders'
import { claimSchemaFor, educationSchema, jobSchema, projectSchema, subjectsIn } from './content/schema.ts'

// Jobs, projects, education and claims (spec 005, D38, D130). Jobs, projects
// and education are written by hand; claims.yaml comes from pnpm content:export (D108, D109). A claim must
// name a job or project file that exists, which reference() wouldn't check
// until a page reads it (FR-006). The entries sit in apps/site/content, outside
// src, since their evidence links are data, not requests the page makes.

const contentDir = fileURLToPath(new URL('../content', import.meta.url))

export const collections = {
  jobs: defineCollection({ loader: glob({ pattern: '*.yaml', base: './content/jobs' }), schema: jobSchema }),
  projects: defineCollection({ loader: glob({ pattern: '*.yaml', base: './content/projects' }), schema: projectSchema }),
  education: defineCollection({ loader: glob({ pattern: '*.yaml', base: './content/education' }), schema: educationSchema }),
  claims: defineCollection({ loader: file('content/claims.yaml'), schema: claimSchemaFor(subjectsIn(contentDir)) }),
}
