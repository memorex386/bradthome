// Two companies' marks (spec 039, D235): Hopper's beside the Hopper band's
// eyebrow and Bleacher Report's beside its featured card's title, and nowhere
// else, never in the timeline. Each is the company's own artwork, from its own
// site, unredrawn and in its own colors, resized for the page and stripped of
// metadata. The name sits beside each mark, so its alt text is empty, and the
// home and role pages' footer says the names and marks belong to their owners.
// No other company's mark goes on the site: not Capital One's, the partners',
// Bottle Rocket's clients', Harley-Davidson's or Infosys's. Where and when
// each was taken is in D235's record, since the site's source names no
// other host (spec 003's FR-006).

/** A mark: its file in public/marks/, its pixel size and the height it shows at. */
export interface Mark {
  src: string
  width: number
  height: number
  /** The height it shows at, in CSS pixels; its width follows the file's shape. */
  shown: number
}

/** The marks, by the job file whose name they sit beside. */
export const MARKS: Readonly<Record<'hopper' | 'bleacher-report', Mark>> = {
  // Hopper's press kit's white horizontal logo, the running bunny and "hopper",
  // the kit's white PNG, for the band's dark ground (its vector logo is
  // coral), at twice the 30 px it shows at.
  hopper: {
    src: '/marks/hopper.png',
    width: 223,
    height: 60,
    shown: 30,
  },
  // Bleacher Report's own header mark from bleacherreport.com, "B/R" in white
  // on its #1a1a1a tile, the colors its light scheme draws it in.
  'bleacher-report': {
    src: '/marks/bleacher-report.svg',
    width: 1600,
    height: 1200,
    shown: 40,
  },
}

/** The footer's line on the home and role pages (Brad's Gate 1 card). */
export const OWNERS_LINE = 'Company names and marks belong to their owners.'

/** A mark's width at the height it shows at, rounded to the pixel, for its width attribute. */
export const shownWidth = (mark: Mark): number => Math.round((mark.width / mark.height) * mark.shown)
