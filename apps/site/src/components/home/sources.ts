// The labels of the sources a card lists under its claims (spec 038, D229).
// A source the card already links, from a stat or its own links, isn't
// listed, so only these six show: the Capital One card's two and
// bradthome.com's four. Each label is made of its claim's words where they
// can name the page, as the claims' titles are, and claims only what the page
// shows (D219). A listed source with no label here fails the build.

export const SOURCE_LABELS: Readonly<Record<string, string>> = {
  'https://yourmileagemayvary.com/2024/07/22/how-to-beat-deltas-meltdown-with-capital-ones-flight-disruption-assistance/':
    'The offer card, in a 2024 travel-blog post',
  'https://hts.hopper.com/news/a-new-milestone-in-our-partnership-with-capital-one': 'Hopper Technology Solutions, March 2026',
  'https://bradthome.com/design-system': 'The design system',
  'https://github.com/memorex386/bradthome/blob/main/docs/working-agreement.md': 'Each feature starts as a spec Brad approves',
  'https://github.com/memorex386/bradthome/blob/main/docs/releases/v2.5.0.md': "A release's written record",
  'https://bradthome.com/evals': 'The latest eval run, case by case',
}
