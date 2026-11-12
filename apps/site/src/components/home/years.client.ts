import { recount } from './years.ts'

// The hero's live years (spec 036), in the site's one module. Each figure
// holds the count the build rendered, such as "11+", and names its start
// month in data-since. This counts again from the visitor's clock, in whole
// months, and only ever raises a figure, so the years grow without a release
// and a clock behind the build never lowers them. With no script the built
// count stands.

recount(document.querySelectorAll<HTMLElement>('[data-since]'), new Date())
