import { type HandCard, type HandCards, MIN_RATINGS, type Snapshot, type Snapshots, snapshotKeyOf } from '../../content/previews.ts'

// What a link's preview card shows (spec 016). A pure function of the link,
// the committed snapshots, the hand-written cards and the job and project
// files, so the static tests can check every word's source. A link with
// neither a snapshot nor a hand-written card gets no preview; a link whose
// snapshot is missing gets the missing state, which names where it goes.

/** A job or project, as a card's row shows it. */
export interface Subject {
  name: string
  start?: string
  end?: string
}

export interface PreviewData {
  snapshots: Snapshots
  hands: HandCards
  subjects: Readonly<Record<string, Subject>>
}

export interface CardRow {
  name: string
  detail: string
}

export interface CardRepo {
  name: string
  description?: string
  stars: string
}

export interface CardView {
  /** The snapshot key or hand-written card ID, for element IDs. */
  key: string
  kind: 'snapshot' | 'hand' | 'missing'
  /** The card's accessible name. */
  label: string
  title: string
  subtitle?: string
  /** The subtitle is a username, set in the mono face. */
  mono: boolean
  /** The image's path under the site's root, or none for the badge. */
  image?: string
  badge: string
  line?: string
  repos: CardRepo[]
  rows: CardRow[]
  /** Where the link goes. */
  host: string
  /** Where and when the card's words came from. */
  provenance: string
  openLabel: string
  href: string
}

/** The link's host, less www. */
export function hostOf(href: string): string {
  return new URL(href).hostname.replace(/^www\./, '')
}

/** A YYYY-MM-DD day as "Nov 5, 2026". */
export function dayOf(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** A job's or project's years, as "2022–2026" or "2015–present". */
export function yearsOf(subject: Subject): string {
  const start = subject.start?.slice(0, 4)
  const end = subject.end === undefined ? undefined : subject.end === 'present' ? 'present' : subject.end.slice(0, 4)
  if (start === undefined) return end ?? ''
  if (end === undefined || end === start) return start
  return `${start}–${end}`
}

const SOURCE = {
  github: { name: 'GitHub', open: 'Open GitHub' },
  appstore: { name: 'the App Store', open: 'Open in the App Store' },
  linkedin: { name: 'LinkedIn', open: 'Open LinkedIn' },
  play: { name: 'Google Play', open: 'Open in Google Play' },
} as const

const count = (n: number): string => n.toLocaleString('en-US')
const imagePath = (name: string | undefined): string | undefined => (name === undefined ? undefined : `/previews/${name}`)

function snapshotCard(key: string, href: string, snapshot: Snapshot): CardView {
  const provenance = `Snapshot from ${SOURCE[snapshot.source].name}, ${dayOf(snapshot.fetched)}`
  if (snapshot.source === 'github') {
    return {
      key,
      kind: 'snapshot',
      label: 'GitHub preview',
      title: snapshot.name,
      subtitle: snapshot.login,
      mono: true,
      image: imagePath(snapshot.image),
      badge: 'GH',
      line: snapshot.bio,
      repos: snapshot.repos.map((repo) => ({
        name: repo.name,
        description: repo.description,
        stars: `${count(repo.stars)} ${repo.stars === 1 ? 'star' : 'stars'}`,
      })),
      rows: [{ name: 'Public repositories', detail: count(snapshot.publicRepos) }],
      host: hostOf(href),
      provenance,
      openLabel: SOURCE.github.open,
      href,
    }
  }
  const rated = snapshot.rating !== undefined && snapshot.ratings !== undefined && snapshot.ratings >= MIN_RATINGS
  return {
    key,
    kind: 'snapshot',
    label: `${snapshot.name} on the App Store, preview`,
    title: snapshot.name,
    subtitle: `${snapshot.seller} · ${snapshot.genre}`,
    mono: false,
    image: imagePath(snapshot.image),
    badge: 'App',
    line: snapshot.summary,
    repos: [],
    rows: rated ? [{ name: 'Rating', detail: `${snapshot.rating?.toFixed(1)} stars · ${count(snapshot.ratings ?? 0)}+ ratings` }] : [],
    host: hostOf(href),
    provenance,
    openLabel: SOURCE.appstore.open,
    href,
  }
}

function handCard(key: string, href: string, hand: HandCard, data: PreviewData): CardView {
  const host = hostOf(href)
  const icon = hand.image === undefined ? undefined : data.snapshots[hand.image]?.image
  const rows = (hand.rows ?? []).map((id) => {
    const subject = data.subjects[id]
    if (subject === undefined) throw new Error(`The ${key} preview lists ${id}, which has no job or project file`)
    return { name: subject.name, detail: yearsOf(subject) }
  })
  const source = hand.source === 'site' ? { name: host, open: `Open ${host}` } : SOURCE[hand.source]
  return {
    key,
    kind: 'hand',
    label: `${hand.title} on ${source.name}, preview`,
    title: hand.title,
    subtitle: hand.source === 'linkedin' ? host + new URL(href).pathname.replace(/\/$/, '') : source.name,
    mono: false,
    image: imagePath(icon),
    badge: hand.badge,
    line: hand.line?.text,
    repos: [],
    rows,
    host,
    provenance: `Written by hand, ${dayOf(hand.written)}`,
    openLabel: source.open,
    href,
  }
}

/** The card a link previews, or undefined when it gets none. */
export function cardOf(href: string, data: PreviewData): CardView | undefined {
  const key = snapshotKeyOf(href)
  if (key !== undefined) {
    const snapshot = data.snapshots[key]
    if (snapshot !== undefined) return snapshotCard(key, href, snapshot)
    const source = key === 'github' ? SOURCE.github : SOURCE.appstore
    const host = hostOf(href)
    return {
      key,
      kind: 'missing',
      label: `${host} preview`,
      title: host,
      mono: false,
      badge: key === 'github' ? 'GH' : 'App',
      line: `There's no snapshot from ${source.name} yet. The link opens the page itself.`,
      repos: [],
      rows: [],
      host,
      provenance: 'No snapshot yet',
      openLabel: source.open,
      href,
    }
  }
  const normal = (value: string): string => value.replace(/\/$/, '')
  const found = Object.entries(data.hands).find(([, hand]) => normal(hand.href) === normal(href))
  return found === undefined ? undefined : handCard(found[0], href, found[1], data)
}
