import type { Page } from '@playwright/test'
import type { PrepAnswer, PrepProgress } from '../../../apps/chat-api/src/prep-shape.ts'
import {
  NO_FIT_ANSWER,
  NOT_POSTING_ANSWER,
  PREP_ANSWER,
  PREP_META,
  ROLE_ANSWER,
} from '../../../apps/site/src/components/chat/prep-fixtures.ts'
import type { PrepMeta } from '../../../apps/site/src/components/chat/types.ts'
import { CHAT_API_ORIGIN, dialogOf, fakeApi, type FakeApi, openChat } from '../../022/helpers/fake-api.ts'

// Spec 024's fake /prep, on top of spec 022's fake API: the same challenge
// and policy, and prep's answers as the API streams them (S5.4).

export { NO_FIT_ANSWER, NOT_POSTING_ANSWER, PREP_ANSWER, PREP_META, ROLE_ANSWER }

export type PrepReply =
  | { kind: 'answer'; answer?: PrepAnswer; meta?: Partial<PrepMeta> }
  | { kind: 'refuse'; status: number; body: Record<string, string | number> }
  | { kind: 'error' }
  | { kind: 'hold' }

export interface FakePrep extends FakeApi {
  /** Each prep body, as the window posted it. */
  prepped: { altcha: string; posting: string }[]
  /** The full address of each request to /prep. */
  urls: string[]
}

const sse = (part: unknown) => `data: ${JSON.stringify(part)}\n\n`
const CORS = { 'Access-Control-Allow-Origin': '*' }

/** Prep's stream: progress as the answer fills, then the result and its numbers. */
export function prepStreamOf(answer: PrepAnswer, meta: PrepMeta): string {
  const steps: PrepProgress[] = [
    { requirements: answer.requirements.length, matches: 0, gaps: 0, questions: 0 },
    { requirements: answer.requirements.length, matches: answer.matches.length, gaps: 0, questions: 0 },
    {
      requirements: answer.requirements.length,
      matches: answer.matches.length,
      gaps: answer.gaps.length,
      questions: answer.questions.length,
    },
  ]
  return [
    sse({ type: 'start' }),
    ...steps.map((data) => sse({ type: 'data-prep-progress', data, transient: true })),
    sse({ type: 'data-prep', data: answer }),
    sse({ type: 'data-meta', data: meta }),
    sse({ type: 'finish' }),
    'data: [DONE]\n\n',
  ].join('')
}

export async function fakePrep(page: Page, replies: readonly PrepReply[] = [{ kind: 'answer' }]): Promise<FakePrep> {
  const api = (await fakeApi(page)) as FakePrep
  api.prepped = []
  api.urls = []
  let sent = 0
  await page.route(`${CHAT_API_ORIGIN}/prep`, async (route, request) => {
    api.paths.push('/prep')
    if (request.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } })
    api.urls.push(request.url())
    api.prepped.push(JSON.parse(request.postData() ?? '{}') as FakePrep['prepped'][number])
    const reply = replies[Math.min(sent, replies.length - 1)] ?? { kind: 'answer' }
    sent += 1
    switch (reply.kind) {
      case 'answer': {
        const answer = reply.answer ?? PREP_ANSWER
        return route.fulfill({
          status: 200,
          headers: { ...CORS, 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
          body: prepStreamOf(answer, { ...PREP_META, state: answer.state, ...reply.meta }),
        })
      }
      case 'refuse':
        return route.fulfill({ status: reply.status, headers: CORS, contentType: 'application/json', body: JSON.stringify(reply.body) })
      case 'error':
        return route.fulfill({
          status: 200,
          headers: { ...CORS, 'Content-Type': 'text/event-stream' },
          body: [sse({ type: 'start' }), sse({ type: 'error', errorText: 'failed' }), 'data: [DONE]\n\n'].join(''),
        })
      case 'hold':
        return
    }
  })
  return api
}

/** Opens the chat and switches to Interview prep. */
export async function openPrep(page: Page): Promise<void> {
  await openChat(page)
  await dialogOf(page).getByRole('button', { name: 'Interview prep' }).click()
  await dialogOf(page).getByLabel('Job description').waitFor()
}

/** Pastes a posting and presses Map Brad to this role. */
export async function mapPosting(page: Page, posting: string): Promise<void> {
  await dialogOf(page).getByLabel('Job description').fill(posting)
  await dialogOf(page).getByRole('button', { name: 'Map Brad to this role' }).click()
}

export { dialogOf }
