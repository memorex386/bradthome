// The browser stays off this repo's pull request and settings pages (FR-019,
// D73). Brad's browser is signed in to GitHub as Brad, so those pages would
// let an agent act as Brad. Claude Code's settings can't hold rules on an MCP
// tool's input, so the guard reads every string in a browser tool's input,
// wherever the URL sits: navigate, a batch of actions, preview_start, a tab.

const REPO_PAGE = /(?:^|[^\w.-])(?:https?:\/\/)?(?:www\.)?github\.com\/memorex386\/bradthome\/(?:pull|pulls|compare|settings)(?:[/?#]|[^\w.-]|$)/i

/** Whether a tool is a browser tool: an MCP server that drives a browser or the screen. */
export function isBrowserTool(toolName: string): boolean {
  const server = /^mcp__(.+?)__/.exec(toolName)?.[1] ?? ''
  return /browser|chrome|playwright|puppeteer|computer/i.test(server)
}

function strings(value: unknown, depth = 0): string[] {
  if (typeof value === 'string') return [value]
  if (depth > 20 || value === null || typeof value !== 'object') return []
  return Object.values(value as Record<string, unknown>).flatMap((inner) => strings(inner, depth + 1))
}

/** Whether a tool's input names one of the repo's pull request or settings pages. */
export function opensRepoPage(toolInput: unknown): boolean {
  return strings(toolInput).some((text) => {
    let decoded = text
    try {
      decoded = decodeURIComponent(text)
    } catch {
      // Not URL-encoded, so the text is checked as it is.
    }
    return REPO_PAGE.test(text) || REPO_PAGE.test(decoded)
  })
}
