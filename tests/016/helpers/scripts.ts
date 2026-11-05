import type { Page } from '@playwright/test'

// The scripts a page loads, for the specs whose pages ran none before spec
// 016. Phase 3's pages now load the link previews' one module, from the site
// itself, and nothing inline (D147, D148).

/** The link previews' module, as Astro names it in _astro/. */
export const PREVIEW_SCRIPT = /^\/_astro\/PreviewLink\.astro_astro_type_script_index_0_lang\.[\w-]+\.js$/

/** Each script on the page, as its path, or "inline" for one with no src. */
export async function scriptsOn(page: Page): Promise<string[]> {
  return page.evaluate(`[...document.querySelectorAll('script')].map((s) => s.getAttribute('src') ?? 'inline')`) as Promise<string[]>
}

/** Whether the page loads the previews' module, and no other script. */
export async function onlyPreviewScript(page: Page): Promise<boolean> {
  const scripts = await scriptsOn(page)
  return scripts.length === 1 && PREVIEW_SCRIPT.test(scripts[0] ?? '')
}
