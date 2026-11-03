import { afterEach, describe, expect, test } from 'vitest'
import { describeRun } from '../../001/helpers/run.ts'
import { createSandbox, type Sandbox, setEnv } from '../../001/helpers/sandbox.ts'
import { HEAD_SHA } from '../helpers/events.ts'
import { BOT, type FakeApi, runNodeAsync, startFakeApi } from '../helpers/github-api.ts'
import { loadPreviewComment } from '../helpers/modules.ts'
import { REPO_SLUG, SCRIPTS } from '../helpers/paths.ts'

// The preview's one comment (FR-015, S3.1, V1): the link, the commit and the
// expiry, posted on the first deploy and edited on each later push rather than
// repeated. The script finds its own comment by a hidden marker, and never
// touches anyone else's.

const PREVIEW = { url: 'https://bradthome--pr-12-a1b2c3d4.web.app', sha: HEAD_SHA, expires: '2026-11-09T15:04:05.000Z' }

const sandboxes: Sandbox[] = []
const apis: FakeApi[] = []
afterEach(async () => {
  for (const sandbox of sandboxes.splice(0)) sandbox.cleanup()
  for (const api of apis.splice(0)) await api.close()
})

async function post(api: FakeApi, preview: typeof PREVIEW = PREVIEW): Promise<void> {
  const sandbox = createSandbox({ terms: false })
  sandboxes.push(sandbox)
  const env = { ...sandbox.env }
  const values: Record<string, string> = {
    GITHUB_API_URL: api.url,
    GITHUB_REPOSITORY: REPO_SLUG,
    GITHUB_TOKEN: 'made-up-job-token',
    PR_NUMBER: '12',
    PREVIEW_URL: preview.url,
    PREVIEW_SHA: preview.sha,
    PREVIEW_EXPIRES: preview.expires,
  }
  for (const [name, value] of Object.entries(values)) setEnv(env, name, value)
  const result = await runNodeAsync(SCRIPTS.previewComment, [], { cwd: sandbox.root, env })
  expect(result.status, describeRun(result)).toBe(0)
  expect(`${result.stdout}${result.stderr}`).not.toContain('made-up-job-token')
}

describe("V1: the comment's words", () => {
  test("S3.1 FR-015 V1 shows the link, the short commit and the expiry date, in the mock's words", async () => {
    const { MARKER, commentBody } = await loadPreviewComment()
    const body = commentBody(PREVIEW)
    expect(MARKER).toMatch(/^<!--[\s\S]*-->$/)
    expect(body).toContain(MARKER)
    expect(body).toContain('Preview ready')
    expect(body).toContain(PREVIEW.url)
    expect(body).toContain(HEAD_SHA.slice(0, 7))
    expect(body).not.toContain(HEAD_SHA)
    expect(body).toMatch(/Nov 9, 2026, 7 days after the last push/)
    expect(body).toContain('Search engines are asked not to index previews. The live site is untouched.')
  })
})

describe('one comment per pull request', () => {
  test('S3.1 FR-015 V1 the first deploy posts one comment, with the job\'s token', async () => {
    const api = await startFakeApi(REPO_SLUG, 12)
    apis.push(api)
    await post(api)
    expect(api.comments).toHaveLength(1)
    expect(api.comments[0]?.body).toContain(PREVIEW.url)
    expect(api.requests.filter((request) => request.method === 'POST')).toHaveLength(1)
    expect(api.requests.every((request) => request.authorization === 'Bearer made-up-job-token' || request.authorization === 'token made-up-job-token')).toBe(true)
  })

  test('S3.1 FR-015 V1 a later push edits that comment rather than adding another', async () => {
    const api = await startFakeApi(REPO_SLUG, 12, [{ id: 1, body: 'Looks good', user: { login: 'memorex386' } }])
    apis.push(api)
    await post(api)
    const second = { ...PREVIEW, sha: 'f'.repeat(40), expires: '2026-11-10T09:00:00.000Z' }
    await post(api, second)
    const ours = api.comments.filter((comment) => comment.user.login === BOT)
    expect(ours).toHaveLength(1)
    expect(ours[0]?.body).toContain('fffffff')
    expect(ours[0]?.body).toMatch(/Nov 10, 2026/)
    expect(api.requests.filter((request) => request.method === 'PATCH')).toHaveLength(1)
    expect(api.comments.find((comment) => comment.id === 1)?.body).toBe('Looks good')
  })

  test("S3.1 FR-015 someone else's comment that quotes the marker is never edited", async () => {
    const { MARKER } = await loadPreviewComment()
    const api = await startFakeApi(REPO_SLUG, 12, [{ id: 7, body: `quoting ${MARKER}`, user: { login: 'someone-else' } }])
    apis.push(api)
    await post(api)
    expect(api.comments.find((comment) => comment.id === 7)?.body).toBe(`quoting ${MARKER}`)
    expect(api.comments.filter((comment) => comment.user.login === BOT)).toHaveLength(1)
  })

  test('S3.1 FR-015 finds its comment past the first page of a long thread', async () => {
    const { commentBody } = await loadPreviewComment()
    const thread = Array.from({ length: 120 }, (_, index) => ({ id: index + 1, body: `comment ${index + 1}`, user: { login: 'memorex386' } }))
    thread.push({ id: 500, body: commentBody(PREVIEW), user: { login: BOT } })
    const api = await startFakeApi(REPO_SLUG, 12, thread)
    apis.push(api)
    await post(api, { ...PREVIEW, sha: 'e'.repeat(40) })
    expect(api.requests.filter((request) => request.method === 'POST')).toHaveLength(0)
    expect(api.comments.find((comment) => comment.id === 500)?.body).toContain('eeeeeee')
  })
})
