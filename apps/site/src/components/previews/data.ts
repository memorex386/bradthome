import { getCollection } from 'astro:content'
import type { HandCards, Snapshots } from '../../content/previews.ts'
import type { PreviewData, Subject } from './cards.ts'

// Reads the link previews' data from the content collections (spec 016):
// the snapshots, the hand-written cards, and the job and project files their
// rows name.

export async function previewData(): Promise<PreviewData> {
  const [snapshots, hands, jobs, projects] = await Promise.all([
    getCollection('previewSnapshots'),
    getCollection('previewCards'),
    getCollection('jobs'),
    getCollection('projects'),
  ])
  const subjects: Record<string, Subject> = {}
  for (const job of jobs) subjects[job.id] = { name: job.data.company, start: job.data.start, end: job.data.end }
  for (const project of projects) subjects[project.id] = { name: project.data.name, start: project.data.start, end: project.data.end }
  return {
    snapshots: Object.fromEntries(snapshots.map((entry) => [entry.id, entry.data])) as Snapshots,
    hands: Object.fromEntries(hands.map((entry) => [entry.id, entry.data])) as HandCards,
    subjects,
  }
}
