import { z } from 'astro/zod'

// Link previews' data (spec 016, D48). Two kinds of card:
//
// - Snapshots, which pnpm previews:refresh fetches from GitHub's and Apple's
//   public APIs and commits to content/previews/snapshots.json, with each
//   image resized into public/previews/. A scheduled workflow refreshes them
//   by pull request; nothing is fetched while a visitor views a page.
// - Hand-written cards, in content/previews/cards.yaml, for LinkedIn, Google
//   Play and Brad's sites, which offer no public API and are never scraped.
//   Each one's words come from a public claim, a job or project file, or the
//   linked page's own public title, and it says when it was written.
//
// Like schema.ts, this file imports nothing from astro:content, so the
// refresh script and the tests load it with plain Node.

const day = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'must be a YYYY-MM-DD day')
const words = z.string().min(1).max(400)
const https = z.url({ protocol: /^https$/ })
/** An image in public/previews/, named by its content's hash. */
const image = z.string().regex(/^[a-z0-9-]+-[0-9a-f]{12}\.webp$/, 'must be a hashed .webp in public/previews')

export const githubSnapshotSchema = z.strictObject({
  source: z.literal('github'),
  href: https,
  fetched: day,
  name: words,
  login: z.string().regex(/^[A-Za-z0-9-]+$/),
  bio: words.optional(),
  publicRepos: z.int().nonnegative(),
  image: image.optional(),
})

export const appStoreSnapshotSchema = z.strictObject({
  source: z.literal('appstore'),
  id: z.string().regex(/^\d+$/),
  href: https,
  fetched: day,
  name: words,
  seller: words,
  genre: words,
  summary: words.optional(),
  /** The average rating, to one decimal place. */
  rating: z.number().min(0).max(5).optional(),
  /** The number of ratings, rounded down to two significant figures, so it changes rarely. */
  ratings: z.int().nonnegative().optional(),
  image: image.optional(),
})

export const snapshotSchema = z.discriminatedUnion('source', [githubSnapshotSchema, appStoreSnapshotSchema])
export const snapshotsSchema = z.record(z.string().regex(/^(github|appstore-\d+)$/), snapshotSchema)

export const handCardSchema = z.strictObject({
  href: https,
  source: z.enum(['linkedin', 'play', 'site']),
  written: day,
  /** The job, project or education file the card is about. A card with none is about Brad. */
  about: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  title: words,
  /** Up to three letters, shown when the card has no image. */
  badge: z.string().min(1).max(3),
  /** The App Store snapshot whose icon the card reuses: the same app on another store. */
  image: z
    .string()
    .regex(/^appstore-\d+$/)
    .optional(),
  /** A line of the card, copied from a public claim. */
  line: z.strictObject({ claim: z.string().min(1), text: words }).optional(),
  /** Jobs or projects listed as rows, with their years. */
  rows: z
    .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    .max(3)
    .optional(),
})

export const handCardsSchema = z.record(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), handCardSchema)

export type GithubSnapshot = z.infer<typeof githubSnapshotSchema>
export type AppStoreSnapshot = z.infer<typeof appStoreSnapshotSchema>
export type Snapshot = z.infer<typeof snapshotSchema>
export type Snapshots = z.infer<typeof snapshotsSchema>
export type HandCard = z.infer<typeof handCardSchema>
export type HandCards = z.infer<typeof handCardsSchema>

/** The smallest number of ratings a card shows a rating for (D143). */
export const MIN_RATINGS = 100

/** The GitHub profile the site links. */
export const GITHUB_LOGIN = 'memorex386'

/** The App Store app ID in a listing's link, or undefined. */
export function appStoreIdOf(href: string): string | undefined {
  const url = new URL(href)
  if (url.hostname !== 'apps.apple.com') return undefined
  return /\/id(\d+)$/.exec(url.pathname)?.[1]
}

/** The snapshot key a link previews from, or undefined. */
export function snapshotKeyOf(href: string): string | undefined {
  const url = new URL(href)
  if (url.hostname === 'github.com' && url.pathname.replace(/\/$/, '') === `/${GITHUB_LOGIN}`) return 'github'
  const id = appStoreIdOf(href)
  return id === undefined ? undefined : `appstore-${id}`
}

/** Rounds a count down to two significant figures: 3,224 becomes 3,200. */
export function roughCount(count: number): number {
  if (count < 100) return count
  const scale = 10 ** (Math.floor(Math.log10(count)) - 1)
  return Math.floor(count / scale) * scale
}
