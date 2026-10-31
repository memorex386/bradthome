// Claude Code's hook protocol: the call comes in as JSON on stdin, and the
// answer goes out as JSON on stdout. Printing nothing and exiting 0 allows the
// call. The hooks never answer "allow", which would skip Claude Code's own
// prompts.

export interface HookInput {
  session_id?: unknown
  cwd?: unknown
  hook_event_name?: unknown
  tool_name?: unknown
  tool_input?: unknown
  stop_hook_active?: unknown
  [field: string]: unknown
}

export interface PreToolUseAnswer {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse'
    permissionDecision: 'deny' | 'ask'
    permissionDecisionReason: string
  }
}

export function deny(reason: string): PreToolUseAnswer {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk as Uint8Array))
  return Buffer.concat(chunks).toString('utf8')
}

/** Parses the input, or returns undefined when it isn't a JSON object. */
export function parseInput(text: string): HookInput | undefined {
  try {
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as HookInput) : undefined
  } catch {
    return undefined
  }
}

export function answer(output: unknown): void {
  if (output !== undefined && output !== null) process.stdout.write(`${JSON.stringify(output)}\n`)
}

/** The folder the tool call runs in, from the input, never from CLAUDE_PROJECT_DIR. */
export function inputCwd(input: HookInput): string {
  return typeof input.cwd === 'string' && input.cwd !== '' ? input.cwd : process.cwd()
}
