import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { claudeConfigDir, GUARD_FOLDER, type Settings, USER_DENY_RULES } from './lib/claude.ts'

// pnpm guard:install: installs the guard for Claude Code sessions started in
// other folders (FR-023, D73). It copies .claude/hooks into Brad's Claude Code
// folder, adds its hook to Brad's user settings, and adds deny rules that
// cover bradthome merges and approvals and no other repo's. Every other
// setting is kept, and running it again changes nothing more. It never prints
// a path, since paths name the machine.

const HOME = path.resolve(import.meta.dirname, '..')

function main(): number {
  const claudeDir = claudeConfigDir(process.env)
  const file = path.join(claudeDir, 'settings.json')
  let settings: Settings = {}
  if (existsSync(file)) {
    try {
      settings = JSON.parse(readFileSync(file, 'utf8')) as Settings
    } catch {
      console.error("✖ guard:install  Claude Code's user settings.json isn't valid JSON, so nothing was changed.")
      console.error('  Fix: correct it, then run pnpm guard:install again.')
      return 1
    }
  }

  const target = path.join(claudeDir, 'hooks', GUARD_FOLDER)
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(path.join(HOME, '.claude', 'hooks'), target, { recursive: true })

  const script = path.join(target, 'user-guard.ts').replaceAll('\\', '/')
  const groups = (settings.hooks?.PreToolUse ?? []).filter(
    (group) => !(group.hooks ?? []).some((handler) => (handler.command ?? '').includes(GUARD_FOLDER)),
  )
  groups.push({ matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: `node "${script}"`, timeout: 30 }] })
  settings.hooks = { ...settings.hooks, PreToolUse: groups }
  settings.permissions = { ...settings.permissions, deny: [...new Set([...(settings.permissions?.deny ?? []), ...USER_DENY_RULES])] }
  mkdirSync(claudeDir, { recursive: true })
  writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`)
  console.log('✓ guard:install  the guard for sessions started elsewhere is installed in your Claude Code user settings')
  return 0
}

process.exitCode = main()
