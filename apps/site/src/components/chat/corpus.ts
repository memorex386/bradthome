// A source opened in place (A5) shows its words from the site's own
// /corpus.json (spec 020), fetched once, the first time a visitor opens one.

let corpus: Promise<Map<string, string>> | undefined

/** Each source's text, by its ID. */
export function sourcesText(fetcher: typeof fetch = fetch.bind(globalThis)): Promise<Map<string, string>> {
  corpus ??= fetcher('/corpus.json')
    .then((response) => {
      if (!response.ok) throw new Error(`corpus ${response.status}`)
      return response.json() as Promise<{ sources?: { id: string; text: string }[] }>
    })
    .then((json) => new Map((json.sources ?? []).map((source) => [source.id, source.text])))
  corpus.catch(() => {
    corpus = undefined
  })
  return corpus
}

/**
 * A source's link on the site the visitor is on. The corpus links
 * bradthome.com, and a preview or next should open its own copy of the page.
 */
export function hrefOf(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'bradthome.com' ? `${parsed.pathname}${parsed.hash}` : url
  } catch {
    return url
  }
}
