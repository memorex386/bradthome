// Spec 047's four claims, word for word, as Brad approved them at Gate 1 (D255).

export const CLAIMS = {
  'hopper-fintech-ai-2':
    "Built most of an AI sales agent for Hopper's flight booking: in place of the static disruption and cancellation offers, a conversation explained each offer against the traveler's own flight, answered questions from the terms, and let them accept or decline by tapping or typing.",
  'hopper-fintech-ai-3':
    'Grounded it in the flight, traveler and offer data, fetched before the first word, plus retrieval over delay data, past conversions and the terms, and a news and weather search tool.',
  'hopper-fintech-ai-4': 'Shipped it behind an LLM-as-judge eval gate, with LLM observability, OpenTelemetry tracing, alerts and a kill switch.',
  'hopper-fintech-ai-5': 'In an A/B test against the static offers, it lifted the attach rate by 12.6% and ramped to 100% of app traffic.',
} as const
