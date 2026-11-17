// Interview prep's fixed card, "What Brad is looking for" (spec 042, D243): the
// Role, Team and How I build lines, then the track for the role prep names, in
// Brad's words from content/wants.yaml, which the page hands the window in the
// dialog's data-wants. No model writes or chooses any of it: which track shows
// is decided here, from the role's own words, and the card never says whether
// the role fits (D203).

export type Track = 'mobile' | 'fullstack' | 'ai'

export const TRACKS: readonly Track[] = ['mobile', 'fullstack', 'ai']

/** The lines the card shows, as the page hands them over. */
export interface PrepWants {
  role: string
  team: string
  build: string
  tracks: Record<Track, string>
}

/**
 * The words that name each track in a role's title, matched as whole words,
 * any case (FR-012). "React Native" names mobile, so it's taken out before
 * full-stack's "React" is looked for.
 */
export const TRACK_WORDS: Readonly<Record<Track, RegExp>> = {
  mobile: /\b(mobile|android|ios|kotlin|swift|swiftui|jetpack compose|react native|flutter|kmp|multiplatform)\b/i,
  fullstack: /\b(full[- ]?stack|front[- ]?end|web|react|typescript|javascript|node(\.js)?)\b/i,
  ai: /\b(ai|ml|llms?|genai|machine learning|artificial intelligence|agents?|agentic)\b/i,
}

/**
 * The tracks the card shows for a role: the one track whose words the role's
 * title names, or all three when it names none, or more than one.
 */
export function tracksFor(role: string): readonly Track[] {
  const named = TRACKS.filter((track) => TRACK_WORDS[track].test(track === 'fullstack' ? role.replace(/react native/gi, '') : role))
  return named.length === 1 ? named : TRACKS
}

/** The card's lines from the dialog's data-wants, or nothing, so a page without them shows no card. */
export function wantsFrom(data: string | undefined): PrepWants | undefined {
  if (data === undefined || data === '') return undefined
  try {
    const value = JSON.parse(data) as Partial<PrepWants>
    const text = (item: unknown): item is string => typeof item === 'string' && item !== ''
    const tracks = value.tracks as Partial<Record<Track, unknown>> | undefined
    if (!text(value.role) || !text(value.team) || !text(value.build) || !TRACKS.every((track) => text(tracks?.[track]))) return undefined
    return value as PrepWants
  } catch {
    return undefined
  }
}
