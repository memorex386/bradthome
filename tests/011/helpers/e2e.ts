import type { Page } from '@playwright/test'

// Spec 038's proof on the card, as the end-to-end tests of specs 011, 012 and
// 013 read it (D229, D230): each claim carries the anchor its receipt had and
// ends with one sparkle, and a sparkle or a linked stat draws its focus ring
// on another box than the link itself. Playwright runs these in the pinned
// container only.

/** The words spec 038 retires (FR-001): no section may hold them. */
export const RETIRED = ['Ask me', 'Ask Brad about it', 'Ask Brad about these', 'No public link yet', 'No public links yet'] as const

/** A claim as the page shows it, with its sparkle. */
export interface ClaimView {
  /** Its id, the anchor its receipt had. */
  id: string
  /** Its data-claim. */
  claim: string | null
  /** Its words as a visitor reads them: its paragraphs and list items joined by a space. */
  text: string
  /** How many sparkles it holds. */
  asks: number
  /** Whether its sparkle is the last thing in it, held with its last word. */
  ends: boolean
  href: string | null
  question: string | null
  tip: string | null
  name: string | null
  /** The sparkle's own words, which are none: it holds only its icon. */
  words: string
}

/** Every claim inside a selector, in page order. */
export async function claimsIn(page: Page, scope: string): Promise<ClaimView[]> {
  // A function with the scope passed in, not code built from strings (CodeQL's js/bad-code-sanitization).
  return (await page.locator(`${scope} .ds-claim`).evaluateAll((claims) => claims.map((claim) => {
    const asks = claim.querySelectorAll('.ds-claim-ask')
    const ask = asks[asks.length - 1]
    const parts = [...claim.querySelectorAll('p, li')]
    const text = (parts.length > 0 ? parts.map((part) => part.textContent).join(' ') : claim.textContent ?? '').replace(/\s+/g, ' ').trim()
    let ends = false
    if (ask) {
      const after = claim.ownerDocument.createRange()
      after.setStartAfter(ask)
      after.setEnd(claim, claim.childNodes.length)
      // The word the sparkle keeps to: the rest of its span, which must be the claim's last word.
      const word = [...ask.parentElement.childNodes].filter((node) => node !== ask).map((node) => node.textContent).join('')
      ends = after.toString().trim() === '' && ask.parentElement.matches('.ds-claim__end') && /^\S+$/.test(word) && text.endsWith(word)
    }
    return {
      id: claim.id,
      claim: claim.getAttribute('data-claim'),
      text,
      asks: asks.length,
      ends,
      href: ask?.getAttribute('href') ?? null,
      question: ask?.getAttribute('data-chat-ask') ?? null,
      tip: ask?.getAttribute('data-tip') ?? null,
      name: ask?.getAttribute('aria-label') ?? null,
      words: ask?.textContent ?? '',
    }
  }))) as ClaimView[]
}

/** A focused control's ring, and what it is. */
export interface Ring {
  outline: string
  width: number
  color: string
  label: string
  tag: string
  /** Where the ring is drawn: a sparkle's disc, a linked stat's box, or the control itself. */
  on: 'disc' | 'stat' | 'self'
}

/**
 * The focused element's ring. A sparkle draws it around its disc, its
 * ::before, and a linked stat around the whole stat (spec 038); anything else
 * on itself.
 */
export async function ringOf(page: Page): Promise<Ring | null> {
  return (await page.evaluate(String.raw`(() => {
    const element = document.activeElement
    if (element === null || element === document.body) return null
    const on = element.matches('.ds-claim-ask') ? 'disc' : element.matches('.ds-stat__link') ? 'stat' : 'self'
    const style = on === 'disc' ? getComputedStyle(element, '::before') : getComputedStyle(on === 'stat' ? element.closest('.ds-stat') : element)
    return {
      outline: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
      color: style.outlineColor,
      label: (element.getAttribute('aria-label') ?? element.textContent ?? '').replace(/\s+/g, ' ').trim(),
      tag: element.tagName.toLowerCase(),
      on,
    }
  })()`)) as Ring | null
}

/** Opens the home on a claim's anchor, as a source link in a chat answer does, and waits for its fonts. */
export async function openOnClaim(page: Page, id: string): Promise<void> {
  await page.goto(`/#receipt-${id}`)
  await page.evaluate('document.fonts.ready.then(() => undefined)')
}

/** The claim a page landed on, as the browser sees it: whether it's the target, and its tint. */
export async function landing(page: Page, id: string): Promise<{ target: boolean; background: string }> {
  // A function on the claim's own element, not code built from strings (CodeQL's js/bad-code-sanitization).
  return page.locator(`[id="receipt-${id}"]`).evaluate((claim) => ({
    target: claim.matches(':target'),
    background: claim.ownerDocument.defaultView?.getComputedStyle(claim).backgroundColor ?? '',
  }))
}
