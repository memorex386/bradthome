// The chat API's settings, each named once (spec 021, S8.3). The model is one
// setting (D171), and the limits are D169's and D173's.

/** The model that answers (D171). A change to it runs the evals first (slice 4.4). */
export const MODEL = 'claude-haiku-5-5'

/** The spending shutoffs, in US dollars, by UTC day and month (D169). */
export const DAY_LIMIT_USD = 2.5
export const MONTH_LIMIT_USD = 20

/** Each visitor's questions a UTC day (D173). */
export const QUESTIONS_PER_DAY = 20

/** The most an answer may write. */
export const MAX_OUTPUT_TOKENS = 800

/** A conversation sent with a question: its messages and their lengths, in characters. */
export const MAX_MESSAGES = 10
export const MAX_QUESTION_CHARS = 1_000
export const MAX_ANSWER_CHARS = 4_000
/** The largest request body read, in bytes. */
export const MAX_BODY_BYTES = 64 * 1024

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
export const SECRETS = { anthropic: 'chat-anthropic-key', altcha: 'chat-altcha-key' } as const

/** The service's own address, which only the preview and next CSP allow (D183). */
export const CHAT_API_ORIGIN = `https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app`

/** The Firestore collection that holds the day and month totals (D182). */
export const SPEND_COLLECTION = 'chat-spend'
