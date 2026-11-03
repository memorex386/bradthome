import { envValue } from '../lib/terms.ts'

// The preview's one comment on its pull request (FR-015, S3.1, V1): the link,
// the commit and the expiry. It finds its own earlier comment, written by
// github-actions[bot] with a hidden marker, and edits it; otherwise it posts
// one. It never edits anyone else's comment. The job's token has
// pull-requests: write (D99).

export const MARKER = '<!-- bradthome-preview -->'
const BOT = 'github-actions[bot]'
const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function commentBody(preview: { url: string; sha: string; expires: string }): string {
  return [
    MARKER,
    '**Preview ready**',
    '',
    '| | |',
    '| --- | --- |',
    `| Link | ${preview.url} |`,
    `| Commit | \`${preview.sha.slice(0, 7)}\` |`,
    `| Expires | ${DATE.format(new Date(preview.expires))}, 7 days after the last push |`,
    '',
    'Search engines are asked not to index previews. The live site is untouched.',
    '',
  ].join('\n')
}

interface ApiComment {
  id: number
  body?: string
  user?: { login?: string }
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = envValue(env, name)
  if (!value) throw new Error(`${name} is not set`)
  return value
}

async function call(url: string, token: string, method = 'GET', body?: unknown): Promise<Response> {
  const response = await fetch(url, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`GitHub answered HTTP ${response.status} to ${method} ${new URL(url).pathname}`)
  return response
}

/** The comment this script posted before, on any page of the thread. */
async function findOurs(api: string, repo: string, pr: string, token: string): Promise<ApiComment | undefined> {
  let next: string | undefined = `${api}/repos/${repo}/issues/${pr}/comments?per_page=100`
  for (let page = 0; next !== undefined && page < 50; page += 1) {
    const response = await call(next, token)
    const comments = (await response.json()) as ApiComment[]
    const ours = comments.find((comment) => comment.user?.login === BOT && (comment.body ?? '').includes(MARKER))
    if (ours !== undefined) return ours
    next = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get('link') ?? '')?.[1]
  }
  return undefined
}

async function main(env: NodeJS.ProcessEnv): Promise<number> {
  try {
    const api = envValue(env, 'GITHUB_API_URL') || 'https://api.github.com'
    const repo = required(env, 'GITHUB_REPOSITORY')
    const token = required(env, 'GITHUB_TOKEN')
    const pr = required(env, 'PR_NUMBER')
    const body = commentBody({
      url: required(env, 'PREVIEW_URL'),
      sha: required(env, 'PREVIEW_SHA'),
      expires: required(env, 'PREVIEW_EXPIRES'),
    })
    const ours = await findOurs(api, repo, pr, token)
    if (ours === undefined) await call(`${api}/repos/${repo}/issues/${pr}/comments`, token, 'POST', { body })
    else await call(`${api}/repos/${repo}/issues/comments/${ours.id}`, token, 'PATCH', { body })
    console.log(`✓ preview  ${ours === undefined ? 'posted' : 'updated'} the comment on #${pr}`)
    return 0
  } catch (error) {
    console.log(
      [`✖ preview  the comment wasn't posted: ${error instanceof Error ? error.message : 'unknown'}`, '  Fix: re-run the job.'].join('\n'),
    )
    return 1
  }
}

if (import.meta.main) process.exitCode = await main(process.env)
