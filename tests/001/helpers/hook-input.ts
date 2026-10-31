import os from 'node:os'
import path from 'node:path'
import { runNode, type RunResult } from './run.ts'

// Claude Code's hook input, as its hooks reference documents it: the common
// fields, plus each event's own.

export interface HookInput {
  session_id: string
  transcript_path: string
  cwd: string
  permission_mode: string
  hook_event_name: string
  [field: string]: unknown
}

let calls = 0

function common(cwd: string, event: string, sessionId?: string): HookInput {
  calls += 1
  return {
    session_id: sessionId ?? `test-session-${process.pid}-${calls}`,
    transcript_path: path.join(os.tmpdir(), `transcript-${process.pid}-${calls}.jsonl`),
    cwd,
    permission_mode: 'bypassPermissions',
    hook_event_name: event,
  }
}

export function toolCall(toolName: string, toolInput: unknown, cwd: string): HookInput {
  return { ...common(cwd, 'PreToolUse'), tool_name: toolName, tool_input: toolInput, tool_use_id: `toolu_test_${calls}` }
}

export function bash(command: string, cwd: string): HookInput {
  return toolCall('Bash', { command, description: 'Run a command' }, cwd)
}

export function powershell(command: string, cwd: string): HookInput {
  return toolCall('PowerShell', { command, description: 'Run a command' }, cwd)
}

export function edit(filePath: string, cwd: string): HookInput {
  return toolCall('Edit', { file_path: filePath, old_string: 'before', new_string: 'after', replace_all: false }, cwd)
}

export function write(filePath: string, cwd: string): HookInput {
  return toolCall('Write', { file_path: filePath, content: 'after\n' }, cwd)
}

export function userPrompt(cwd: string, sessionId: string): HookInput {
  return { ...common(cwd, 'UserPromptSubmit', sessionId), prompt: 'Keep going with the build.' }
}

export function stop(cwd: string, sessionId: string, stopHookActive = false): HookInput {
  return {
    ...common(cwd, 'Stop', sessionId),
    stop_hook_active: stopHookActive,
    last_assistant_message: 'Done.',
    background_tasks: [],
    session_crons: [],
  }
}

export interface Decision {
  decision: string
  reason: string | undefined
}

/**
 * Reads a PreToolUse hook's answer. Nothing at all means allow, since the
 * hooks never answer "allow", which would skip Claude Code's own prompts.
 */
export function preToolUseDecision(output: unknown): Decision {
  if (output === undefined || output === null) return { decision: 'allow', reason: undefined }
  const specific = (output as { hookSpecificOutput?: Record<string, unknown> }).hookSpecificOutput
  const decision = specific?.permissionDecision
  const reason = specific?.permissionDecisionReason
  return {
    decision: typeof decision === 'string' ? decision : 'missing',
    reason: typeof reason === 'string' ? reason : undefined,
  }
}

/** Runs a hook script as Claude Code does: JSON on stdin, an answer on stdout. */
export function runHook(script: string, input: unknown, env: NodeJS.ProcessEnv, cwd = os.tmpdir()): RunResult {
  return runNode(script, [], { cwd, env, input: typeof input === 'string' ? input : JSON.stringify(input) })
}

/**
 * A PreToolUse hook process's answer. Exit code 2 blocks the call, the same
 * as a deny.
 */
export function processDecision(result: RunResult): Decision {
  if (result.status === 2) return { decision: 'deny', reason: result.stderr.trim() }
  if (result.status !== 0) return { decision: `exit ${result.status}`, reason: result.stderr.trim() }
  const text = result.stdout.trim()
  if (text === '') return { decision: 'allow', reason: undefined }
  return preToolUseDecision(JSON.parse(text))
}
