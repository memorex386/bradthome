import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// pnpm touch-icon: draws the home-screen icon, public/apple-touch-icon.png,
// from the site icon, public/favicon.svg (spec 039, D236). iOS rounds a
// home-screen icon itself, so this one is the mark on a full square: the
// favicon's own drawing with its corners squared and its faint edge left off.
// The letters are paths, so it needs no font. Run it after a change to the
// favicon; tests/039 fails while the two disagree.
//
//   pnpm touch-icon           write the icon
//   pnpm touch-icon --check   say whether the committed icon matches

const ROOT = path.resolve(import.meta.dirname, '..', '..')
export const FAVICON = path.join(ROOT, 'apps', 'site', 'public', 'favicon.svg')
export const TOUCH_ICON = path.join(ROOT, 'apps', 'site', 'public', 'apple-touch-icon.png')

/** The icon's size: iOS's home-screen icon at 3x. */
export const SIZE = 180

/** The favicon's drawing on a square: no rounded corners and no edge, at the icon's size. */
export function squareOf(favicon: string): string {
  const squared = favicon
    .replace(
      /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32">/,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${SIZE}" height="${SIZE}">`,
    )
    .replace('<rect width="32" height="32" rx="7" fill=', '<rect width="32" height="32" fill=')
    .replace(/<rect x="\.5" y="\.5" width="31" height="31" rx="6\.5" fill="none" stroke="#fff" stroke-opacity="\.16"\/>/, '')
  if (squared === favicon || squared.includes('rx="7"') || squared.includes('stroke-opacity')) {
    throw new Error('The favicon no longer has the shape the touch icon squares: a 32-unit rounded square with a faint edge.')
  }
  return squared
}

/** The icon's PNG, drawn from the favicon's text. */
export async function touchIconOf(favicon: string): Promise<Buffer> {
  return sharp(Buffer.from(squareOf(favicon)))
    .resize(SIZE, SIZE)
    .flatten({ background: '#0e1116' })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function main(args: readonly string[]): Promise<number> {
  const icon = await touchIconOf(readFileSync(FAVICON, 'utf8'))
  if (args.includes('--check')) {
    const committed = await sharp(readFileSync(TOUCH_ICON)).raw().toBuffer()
    const drawn = await sharp(icon).raw().toBuffer()
    if (committed.equals(drawn)) {
      console.log('✓ touch-icon  public/apple-touch-icon.png matches public/favicon.svg')
      return 0
    }
    console.log(['✖ touch-icon  public/apple-touch-icon.png is out of date', '  Fix: pnpm touch-icon'].join('\n'))
    return 1
  }
  writeFileSync(TOUCH_ICON, icon)
  console.log(`✓ touch-icon  wrote public/apple-touch-icon.png, ${SIZE} × ${SIZE}, ${icon.length} bytes`)
  return 0
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2))
