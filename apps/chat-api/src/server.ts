import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createAnthropic } from '@ai-sdk/anthropic'
import { serve } from '@hono/node-server'
import { getConnInfo } from '@hono/node-server/conninfo'
import { createApp } from './app.ts'
import { MODEL } from './constants.ts'
import { parseCorpus } from './corpus.ts'
import { federatedToken } from './federation.ts'
import { firestoreStore } from './firestore.ts'

// Cloud Run's entry (D170). Cloud Run fills ALTCHA_KEY from Secret Manager
// (D184), and the deploy sets CHAT_MODEL (D185). Anthropic's tokens come from
// workload identity federation, so no key exists (D187). The corpus is the one
// live served when the deploy bundled it, beside this file.

const env = (name: string): string => {
  const value = process.env[name]
  if (value === undefined || value === '') throw new Error(`${name} is not set.`)
  return value
}

const modelId = process.env.CHAT_MODEL ?? MODEL
const corpus = parseCorpus(JSON.parse(readFileSync(path.join(import.meta.dirname, 'corpus.json'), 'utf8')))
const anthropic = createAnthropic({ authToken: federatedToken() })

const app = createApp({
  model: anthropic(modelId),
  modelId,
  store: firestoreStore(),
  corpus,
  altchaKey: env('ALTCHA_KEY'),
  connection: (c) => getConnInfo(c).remote.address,
})

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8080) })
