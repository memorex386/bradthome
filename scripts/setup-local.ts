import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { AGENT_LOGIN, AGENT_SUSPENDED, ghLogin } from './lib/gh.ts'
import { runGit, topLevel } from './lib/git.ts'

// Runs on pnpm install, after husky (FR-015, FR-018, D78). On a machine that
// set bradthome.agentGhConfigDir, and whose folder there holds the agent's gh
// login, it points gh at that folder for Claude Code in this checkout, through
// the ignored .claude/settings.local.json. Everywhere else, CI included, it
// does nothing. While the agent's account is suspended, it leaves gh as it was,
// so gh acts as Brad's own login (D160). It never prints the folder, since the
// path is the machine's.

const SETTING = 'bradthome.agentGhConfigDir'
const NOTE = 'so gh in Claude Code here is left as it was. pnpm setup:check shows the fix.'

interface LocalSettings {
  env?: Record<string, string>
  [key: string]: unknown
}

function main(): void {
  const root = topLevel(process.cwd()) ?? process.cwd()
  const setting = runGit(['config', '--global', '--type=path', '--get', SETTING], { cwd: root })
  const dir = setting.status === 0 ? setting.stdout.trim() : ''
  if (dir === '') return
  const file = path.join(root, '.claude', 'settings.local.json')
  let settings: LocalSettings = {}
  if (existsSync(file)) {
    try {
      settings = JSON.parse(readFileSync(file, 'utf8')) as LocalSettings
    } catch {
      console.log(`setup-local: .claude/settings.local.json isn't valid JSON, ${NOTE}`)
      return
    }
  }
  if (AGENT_SUSPENDED) {
    // An earlier install may have pointed gh at the agent's folder. Take that
    // back out, so gh uses its default folder, Brad's login (D160).
    const current = settings.env?.GH_CONFIG_DIR
    if (current === undefined || !samePath(current, dir)) {
      console.log(`setup-local: ${AGENT_LOGIN}'s account is suspended, ${NOTE}`)
      return
    }
    const { GH_CONFIG_DIR: _agent, ...env } = settings.env ?? {}
    const { env: _env, ...rest } = settings
    writeFileSync(
      file,
      `${JSON.stringify(Object.keys(env).length === 0 ? rest : { ...rest, env }, null, 2)}
`,
    )
    console.log(`setup-local: ${AGENT_LOGIN}'s account is suspended, so Claude Code in this checkout now runs gh with its default login.`)
    return
  }
  if (!existsSync(dir)) {
    console.log(`setup-local: the folder that ${SETTING} names doesn't exist, ${NOTE}`)
    return
  }
  if (ghLogin(dir) !== AGENT_LOGIN) {
    console.log(`setup-local: the folder that ${SETTING} names doesn't hold ${AGENT_LOGIN}'s gh login, ${NOTE}`)
    return
  }
  if (settings.env?.GH_CONFIG_DIR === dir) return
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(
    file,
    `${JSON.stringify({ ...settings, env: { ...settings.env, GH_CONFIG_DIR: dir } }, null, 2)}
`,
  )
  console.log(`setup-local: Claude Code in this checkout now runs gh as ${AGENT_LOGIN}.`)
}

/** Whether two paths name the same folder, ignoring slashes and, on Windows, case. */
function samePath(a: string, b: string): boolean {
  const norm = (p: string) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p))
  return norm(a) === norm(b)
}

main()
