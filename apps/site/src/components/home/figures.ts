// The Hopper band's three diagrams (spec 039, D234), one on each of three
// topic cards: Capital One end to end, RemoteUI, and the human-approved loop.
// Each restates its card's claims in their own words, so it adds no fact and
// the chat's sources don't change. Every label names the claim its words come
// from, and the build fails if a label holds a word its claim doesn't, as
// side.ts's SITE_RULES fails it when a claim stops ending with its rule.
// The figures are hidden from screen readers, since the claims beside them
// say the same, and they have no motion of their own (D211).

/** A label in a diagram, and the claim its words come from. */
export interface Label {
  text: string
  claim: string
}

/** The Capital One card's diagram: every layer one owner shipped, then the partners it reached. */
export interface CapitalOneFigure {
  kind: 'capital-one'
  owner: Label
  layers: readonly Label[]
  reuse: Label
  partners: Label
  products: Label
}

/** The RemoteUI card's diagram: one server-driven UI reaching both native apps by server deploys. */
export interface RemoteUiFigure {
  kind: 'remoteui'
  server: Label
  parts: readonly Label[]
  deploys: Label
  releases: Label
  android: Label
  androidStack: Label
  ios: Label
  iosStack: Label
}

/** The agent workflow card's diagram: the experimentation loop, with the person who approves. */
export interface LoopFigure {
  kind: 'loop'
  name: Label
  telemetry: Label
  telemetrySources: Label
  generates: Label
  generated: readonly Label[]
  approved: Label
  releases: Label
  flags: Label
  monitors: Label
  promotion: Label
}

export type Figure = CapitalOneFigure | RemoteUiFigure | LoopFigure

const DA1 = 'hopper-disruption-assistance-1'
const DA2 = 'hopper-disruption-assistance-2'
const DA3 = 'hopper-disruption-assistance-3'
const RUI = 'hopper-mobile-remoteui-and-webviews-1'
const LOOP = 'hopper-agent-and-experimentation-workflow-1'

const label = (text: string, claim: string): Label => ({ text, claim })

/** Each diagram, by the topic whose card shows it, in the topic names of content/claims.yaml. */
export const FIGURES: Readonly<Record<string, Figure>> = {
  'Disruption Assistance': {
    kind: 'capital-one',
    owner: label('Sole engineering owner', DA1),
    layers: [
      label('RFC and ADR, stakeholder alignment', DA2),
      label('New services on Terraform-provisioned GCP', DA2),
      label('Backend APIs', DA2),
      label('Payment flow with rewards points', DA2),
      label('Offer generation and Redis caching', DA2),
      label('React: bottom sheet, offer and purchase', DA2),
      label('Feature flags and a phased rollout', DA2),
      label('Analytics, monitoring and alerting', DA2),
    ],
    reuse: label('reusable capability', DA1),
    partners: label('Capital One → 5 more partners', DA1),
    products: label('10+ partner products, including Frontier and Spirit', DA3),
  },
  'Mobile: RemoteUI and WebViews': {
    kind: 'remoteui',
    server: label('Server-driven UI', RUI),
    parts: [label('components, actions,', RUI), label('state management, API mappings', RUI)],
    deploys: label('server deploys', RUI),
    releases: label('app releases', RUI),
    android: label('Android', RUI),
    androidStack: label('Jetpack Compose and MVVM', RUI),
    ios: label('iOS', RUI),
    iosStack: label('SwiftUI', RUI),
  },
  'Agent and experimentation workflow': {
    kind: 'loop',
    name: label('Experimentation loop', LOOP),
    telemetry: label('Telemetry', LOOP),
    telemetrySources: label('Amplitude, BigQuery', LOOP),
    generates: label('Generates', LOOP),
    generated: [label('UI, code, pull requests', LOOP), label('and visual/browser tests', LOOP)],
    // Where the approval sits is the study's reading of "human-approved": after
    // what the loop generates, before it releases (Brad's Gate 1 card).
    approved: label('Human-approved', LOOP),
    releases: label('Releases behind flags', LOOP),
    flags: label('LaunchDarkly', LOOP),
    monitors: label('Monitors outcomes', LOOP),
    promotion: label('Promotion or rollback', LOOP),
  },
}

/** A text's words, as a label is checked against its claim: lowercase letters, digits and "+", so "10+" stays one word. */
export function wordsOf(text: string): string[] {
  return [...text.toLowerCase().matchAll(/[\p{L}\p{N}+]+/gu)].map((match) => match[0])
}

/** Every label in a diagram, in the order it draws them. */
export function labelsOf(figure: Figure): Label[] {
  switch (figure.kind) {
    case 'capital-one':
      return [figure.owner, ...figure.layers, figure.reuse, figure.partners, figure.products]
    case 'remoteui':
      return [
        figure.server,
        ...figure.parts,
        figure.deploys,
        figure.releases,
        figure.android,
        figure.androidStack,
        figure.ios,
        figure.iosStack,
      ]
    case 'loop':
      return [
        figure.name,
        figure.telemetry,
        figure.telemetrySources,
        figure.generates,
        ...figure.generated,
        figure.approved,
        figure.releases,
        figure.flags,
        figure.monitors,
        figure.promotion,
      ]
  }
}

/**
 * Checks each label's words against its claim, and that the claim is on the
 * diagram's card. Throws on the first label whose words leave its claim, so
 * the build fails rather than drawing a fact the claims don't hold.
 */
export function checkFigure(topic: string, figure: Figure, claims: readonly { id: string; topic?: string; text: string }[]): void {
  const byId = new Map(claims.map((claim) => [claim.id, claim]))
  for (const { text, claim: id } of labelsOf(figure)) {
    const claim = byId.get(id)
    if (claim === undefined) throw new Error(`The ${topic} diagram's "${text}" needs the public claim ${id}.`)
    if (claim.topic !== topic) throw new Error(`The ${topic} diagram's "${text}" comes from ${id}, which isn't on its card.`)
    const words = new Set(wordsOf(claim.text))
    const missing = wordsOf(text).filter((word) => !words.has(word))
    if (missing.length > 0) throw new Error(`The ${topic} diagram's "${text}" holds words its claim ${id} doesn't: ${missing.join(', ')}.`)
  }
}

/** The diagram a topic's card shows, checked against the claims, or undefined for a card with none. */
export function figureOf(topic: string, claims: readonly { id: string; topic?: string; text: string }[]): Figure | undefined {
  const figure = FIGURES[topic]
  if (figure === undefined) return undefined
  checkFigure(topic, figure, claims)
  return figure
}
