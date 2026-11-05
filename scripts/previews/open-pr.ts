import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { topLevel } from '../lib/git.ts'
import { changedPaths, type GitHub, openRefreshPr, REFRESH_PATHS } from './open-pr-lib.ts'

// node scripts/previews/open-pr.ts, the previews workflow's last step (spec
// 016). Reads what pnpm previews:refresh changed in the checkout and opens the
// refresh pull request with the GitHub App's token in GH_TOKEN. REPORT names
// the refresh's report file; BASE_SHA is the commit it ran on.

const root = topLevel(process.cwd()) ?? process.cwd()
const token = process.env.GH_TOKEN
const repo = process.env.GITHUB_REPOSITORY
const base = process.env.BASE_SHA
if (!token || !repo || !base) throw new Error('GH_TOKEN, GITHUB_REPOSITORY and BASE_SHA must be set')

const api = process.env.GITHUB_API_URL ?? 'https://api.github.com'
const call = async (method: string, url: string, body?: unknown): Promise<unknown> => {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bradthome.com link previews',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await response.json()) as unknown
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${method} ${new URL(url).pathname}`)
  return json
}
const github: GitHub = {
  rest: (method, route, body) => call(method, `${api}${route}`, body),
  async graphql(query, variables) {
    const result = (await call('POST', `${api}/graphql`, { query, variables })) as { errors?: { message: string }[] }
    if (result.errors?.length) throw new Error(`GitHub's GraphQL API refused the commit: ${result.errors.map((e) => e.message).join('; ')}`)
    return result
  },
}

const porcelain = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', ...REFRESH_PATHS], {
  cwd: root,
  encoding: 'utf8',
})
const changes = changedPaths(porcelain).map(({ path: file, deleted }) =>
  deleted || !existsSync(path.join(root, file))
    ? { path: file }
    : { path: file, bytes: new Uint8Array(readFileSync(path.join(root, file))) },
)
const report = process.env.REPORT && existsSync(process.env.REPORT) ? readFileSync(process.env.REPORT, 'utf8').trim().split('\n') : []
const today = (process.env.PREVIEWS_TODAY ?? new Date().toISOString()).slice(0, 10)

const result = await openRefreshPr({ github, repo, base, today, changes, report })
const line =
  result.kind === 'none'
    ? 'Nothing changed, so no pull request.'
    : result.kind === 'open'
      ? `Refresh pull request #${result.number} is still open, so this run opens none. Merge or close it first.`
      : `Opened refresh pull request #${result.number} from ${result.branch}.`
process.stdout.write(`${line}\n`)
