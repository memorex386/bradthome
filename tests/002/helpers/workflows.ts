import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

// The workflows and Dependabot's config, read as YAML.

export interface Step {
  id?: string
  name?: string
  uses?: string
  run?: string
  shell?: string
  if?: string
  with?: Record<string, unknown>
  env?: Record<string, unknown>
  'continue-on-error'?: unknown
}

export interface Job {
  name?: string
  'runs-on'?: unknown
  needs?: string | string[]
  if?: unknown
  permissions?: unknown
  env?: Record<string, unknown>
  strategy?: { matrix?: Record<string, unknown>; 'fail-fast'?: unknown }
  steps?: Step[]
  'continue-on-error'?: unknown
  uses?: string
}

export interface Workflow {
  name?: string
  on?: unknown
  permissions?: unknown
  concurrency?: unknown
  env?: Record<string, unknown>
  jobs?: Record<string, Job>
}

export function readYaml<T>(file: string): T {
  return parse(readFileSync(file, 'utf8')) as T
}

export function jobsOf(workflow: Workflow): Record<string, Job> {
  return workflow.jobs ?? {}
}

export function stepsOf(job: Job | undefined): Step[] {
  return job?.steps ?? []
}

/** Every step in every job, with the job's ID. */
export function allSteps(workflow: Workflow): { job: string; step: Step }[] {
  return Object.entries(jobsOf(workflow)).flatMap(([job, value]) => stepsOf(value).map((step) => ({ job, step })))
}

/** A job's run commands, joined. */
export function runsOf(job: Job | undefined): string {
  return stepsOf(job)
    .map((step) => step.run ?? '')
    .join('\n')
}

/** The triggers as an object, whichever way the file writes them. */
export function triggersOf(workflow: Workflow): Record<string, unknown> {
  const on = workflow.on
  if (typeof on === 'string') return { [on]: null }
  if (Array.isArray(on)) return Object.fromEntries(on.map((name: unknown) => [String(name), null]))
  if (on !== null && typeof on === 'object') return on as Record<string, unknown>
  return {}
}

/** Every key anywhere in a parsed document, at any depth. */
export function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys)
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [key, ...allKeys(child)])
  }
  return []
}

/** Every string anywhere in a parsed document. */
export function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(allStrings)
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(allStrings)
  return []
}

/** The check names a workflow's jobs show: a matrix job shows one per value, as tests (ubuntu-24.04). */
export function checkNames(workflow: Workflow): string[] {
  return Object.entries(jobsOf(workflow)).flatMap(([id, job]) => {
    const name = job.name ?? id
    const os = job.strategy?.matrix?.os
    if (!Array.isArray(os)) return [name]
    return os.map((value) =>
      name.includes('${{') ? name.replace(/\$\{\{\s*matrix\.os\s*\}\}/g, String(value)) : `${name} (${String(value)})`,
    )
  })
}
