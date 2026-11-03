import { spawn } from 'node:child_process'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { RunResult } from '../../001/helpers/run.ts'

// A fake of GitHub's REST API for a pull request's comments, on a local port,
// for the preview's comment script. It keeps the comments in memory, logs each
// request, and never reaches GitHub. Comments the script posts are by
// github-actions[bot], as with the job's token. Like GitHub, it pages the list
// with a Link header and gives each comment's user a type, Bot or User.

export interface Comment {
  id: number
  body: string
  user: { login: string; type?: 'Bot' | 'User' }
}

export interface Request {
  method: string
  path: string
  body: unknown
  authorization: string | undefined
}

export interface FakeApi {
  url: string
  comments: Comment[]
  requests: Request[]
  close(): Promise<void>
}

const BOT = 'github-actions[bot]'

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  return text === '' ? undefined : (JSON.parse(text) as unknown)
}

/** Starts the fake for one repo and pull request, holding the comments given. */
export async function startFakeApi(repo: string, pr: number, comments: Comment[] = []): Promise<FakeApi> {
  const state = { comments: [...comments], requests: [] as Request[], next: 1000 }
  const list = `/repos/${repo}/issues/${pr}/comments`
  const one = new RegExp(`^/repos/${repo.replace('/', '\\/')}/issues/comments/(\\d+)$`)
  const server: Server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://localhost')
      const body = await readBody(request)
      state.requests.push({ method: request.method ?? '', path: url.pathname, body, authorization: request.headers.authorization })
      const send = (status: number, value: unknown, headers: Record<string, string> = {}): void => {
        response.writeHead(status, { 'content-type': 'application/json', ...headers })
        response.end(JSON.stringify(value))
      }
      if (url.pathname === list && request.method === 'GET') {
        const page = Number(url.searchParams.get('page') ?? '1')
        const size = Math.min(Number(url.searchParams.get('per_page') ?? '30'), 100)
        const last = Math.max(1, Math.ceil(state.comments.length / size))
        const link = (to: number, rel: string): string => {
          const target = new URL(url.href)
          target.searchParams.set('page', String(to))
          target.searchParams.set('per_page', String(size))
          return `<http://${request.headers.host ?? ''}${target.pathname}${target.search}>; rel="${rel}"`
        }
        const links = [...(page < last ? [link(page + 1, 'next'), link(last, 'last')] : []), ...(page > 1 ? [link(1, 'first'), link(page - 1, 'prev')] : [])]
        const typed = state.comments
          .slice((page - 1) * size, page * size)
          .map((comment) => ({ ...comment, user: { type: comment.user.login.endsWith('[bot]') ? 'Bot' : 'User', ...comment.user } }))
        return send(200, typed, links.length > 0 ? { link: links.join(', ') } : {})
      }
      if (url.pathname === list && request.method === 'POST') {
        const comment = { id: (state.next += 1), body: String((body as { body?: unknown } | undefined)?.body ?? ''), user: { login: BOT, type: 'Bot' as const } }
        state.comments.push(comment)
        return send(201, comment)
      }
      const match = one.exec(url.pathname)
      if (match !== null && request.method === 'PATCH') {
        const comment = state.comments.find((entry) => entry.id === Number(match[1]))
        if (comment === undefined) return send(404, { message: 'Not Found' })
        comment.body = String((body as { body?: unknown } | undefined)?.body ?? '')
        return send(200, comment)
      }
      return send(404, { message: 'Not Found' })
    })()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}`,
    get comments() {
      return state.comments
    },
    get requests() {
      return state.requests
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

/** Runs a script with Node without blocking the event loop, so the fake can answer it. */
export function runNodeAsync(script: string, args: readonly string[], options: { cwd: string; env: NodeJS.ProcessEnv }): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: options.cwd, env: options.env, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')))
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')))
    child.on('error', reject)
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

export { BOT }
