import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

// Reads a résumé PDF as a reader would (spec 015): its pages' text in the
// order it's drawn, its link annotations, its title and its smallest type,
// with Mozilla's PDF.js.

export interface PdfFacts {
  pages: number
  /** Each page's text, its runs joined, with whitespace as single spaces. */
  text: string[]
  links: string[]
  title: string
  /** The smallest font size on any page, in PDF points. */
  smallest: number
}

/** Text with every run of whitespace as one space. JavaScript's \s takes in no-break spaces. */
export const spaced = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** Text with no whitespace at all, so line breaks can't change a comparison. */
export const compact = (text: string): string => text.replace(/\s+/g, '')

export async function readPdf(data: Uint8Array): Promise<PdfFacts> {
  const task = getDocument({ data, useSystemFonts: false })
  const document = await task.promise
  const text: string[] = []
  const links: string[] = []
  let smallest = Number.POSITIVE_INFINITY
  for (let n = 1; n <= document.numPages; n++) {
    const page = await document.getPage(n)
    const content = await page.getTextContent()
    const runs: string[] = []
    for (const item of content.items) {
      if (!('str' in item)) continue
      runs.push(item.str, item.hasEOL ? ' ' : '')
      const size = Math.hypot(item.transform[0] ?? 0, item.transform[1] ?? 0)
      if (item.str.trim() !== '' && size > 0) smallest = Math.min(smallest, size)
    }
    text.push(spaced(runs.join('')))
    for (const annotation of await page.getAnnotations()) {
      if (annotation.subtype === 'Link' && typeof annotation.url === 'string') links.push(annotation.url)
    }
  }
  const meta = await document.getMetadata()
  const info = meta.info as { Title?: string }
  const pages = document.numPages
  await task.destroy()
  return { pages, text, links, title: info.Title ?? '', smallest }
}
