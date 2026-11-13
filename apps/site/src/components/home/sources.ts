// The labels of the sources a card lists under its claims (spec 038, D229),
// by claim and by each source's host, so the site's source names no outside
// address (spec 003's FR-006): the links come from the claims' evidence. A
// source the card already links, from a stat or its own links, isn't listed,
// so only these six show: the Capital One card's two and bradthome.com's
// four. Each label is made of its claim's words where they can name the page,
// as the claims' titles are, and claims only what the page shows (D219). A
// listed source with no label here fails the build.

export const SOURCE_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  // The 2024 travel-blog post and Hopper Technology Solutions' March 2026 release (D219).
  'hopper-disruption-assistance-4': {
    'yourmileagemayvary.com': 'The offer card, in a 2024 travel-blog post',
    'hts.hopper.com': 'Hopper Technology Solutions, March 2026',
  },
  // Its first source, the repo, is the card's own link; its second is the design-system gallery (D218).
  'bradthome-com-1': { 'bradthome.com': 'The design system' },
  // The working agreement.
  'bradthome-com-2': { 'github.com': 'Each feature starts as a spec Brad approves' },
  // v2.5.0's release record.
  'bradthome-com-3': { 'github.com': "A release's written record" },
  // The latest eval run.
  'bradthome-com-4': { 'bradthome.com': 'The latest eval run, case by case' },
}
