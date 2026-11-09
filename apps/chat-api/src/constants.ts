// The chat API's settings, each named once (spec 021, S8.3). The model is one
// setting (D171), and the limits are D169's and D173's.

/** The model that answers (D171). A change to it runs the evals first (slice 4.4). */
export const MODEL = 'claude-haiku-5-5'

/** The spending shutoffs, in US dollars, by UTC day and month (D169). */
export const DAY_LIMIT_USD = 2.5
export const MONTH_LIMIT_USD = 20

/** Each visitor's questions a UTC day (D173). */
export const QUESTIONS_PER_DAY = 20

/**
 * Haiku 5.5 thinks by default, and on a harder question its hidden thinking
 * can use the whole output budget and leave no answer. The chat's answers are
 * short and come from documents, so thinking is off, at low effort.
 */
export const THINKING = { type: 'disabled' } as const
export const EFFORT = 'low'

/** The most an answer may write. */
export const MAX_OUTPUT_TOKENS = 800

/** A conversation sent with a question: its messages and their lengths, in characters. */
export const MAX_MESSAGES = 10
export const MAX_QUESTION_CHARS = 1_000
export const MAX_ANSWER_CHARS = 4_000
/** Interview prep (spec 024, D176): a posting counts as this many questions, and is capped in words and characters. */
export const PREP_QUESTIONS = 3
export const MAX_POSTING_WORDS = 3_000
export const MAX_POSTING_CHARS = 24_000
/** The most a prep answer may write. */
export const PREP_MAX_OUTPUT_TOKENS = 1_500
/** The largest request body read, in bytes. */
export const MAX_BODY_BYTES = 64 * 1024
/** The largest prep body read, in bytes: 24,000 characters of up to 4 bytes each, with room for escapes and ALTCHA. */
export const MAX_PREP_BODY_BYTES = 128 * 1024

/** How long an ALTCHA challenge lasts. */
export const CHALLENGE_SECONDS = 300

/** How long a model call may take before the answer fails. */
export const MODEL_TIMEOUT_MS = 60_000

/** Cloud Logging's default retention for the log lines (D175). */
export const LOG_RETENTION_DAYS = 30

/** Where it runs (D170, D185). */
export const PROJECT = 'bradthome'
export const PROJECT_NUMBER = '568431230204'
export const REGION = 'us-central1'
export const SERVICE = 'chat-api'
export const SERVICE_ACCOUNT = `${SERVICE}@${PROJECT}.iam.gserviceaccount.com`
export const MIN_INSTANCES = 0
export const MAX_INSTANCES = 2
export const TIMEOUT_SECONDS = 120
export const SECRETS = { altcha: 'chat-altcha-key' } as const

/**
 * How the API signs in to Anthropic: workload identity federation, with no
 * API key (D187). Cloud Run's metadata server signs a Google identity token
 * for the service account, and Anthropic's `bradthome-chat-api` rule, in
 * VINDecoded's organization (D186), trades it for a short-lived token in the
 * `bradthome-chat` workspace. The IDs aren't secrets: the rule only accepts a
 * token Google signed for this service account.
 */
export const FEDERATION = {
  googleServiceAccount: SERVICE_ACCOUNT,
  organizationId: 'f0c47680-aa73-4e85-84f6-a4b05edb2784',
  ruleId: 'fdrl_01HqjropRhoKKwfdHHzXd8qd',
  serviceAccountId: 'svac_011YsyXoeXTBguFPG9nuE3So',
  workspaceId: 'wrkspc_01Ey3gkgFgkmbe6Z42Acx5aS',
} as const

/** How long the metadata server and Anthropic's token exchange each get before a question fails. */
export const EXCHANGE_TIMEOUT_MS = 10_000

/** How long before an Anthropic token expires the API trades for a new one, as Anthropic's SDKs do. */
export const TOKEN_REFRESH_SECONDS = 120

/** The service's own address, which only the preview and next CSP allow (D183). */
export const CHAT_API_ORIGIN = `https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app`

/** The Firestore collection that holds the day and month totals (D182). */
export const SPEND_COLLECTION = 'chat-spend'
