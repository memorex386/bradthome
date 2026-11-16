import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// pnpm photo: makes the round photo of Brad beside "Get in touch" (spec 039,
// D237) from a source file: it refuses one under 400 px square (D164), crops
// a square from it, and writes it at the sizes the page shows, 64 and 76 px
// at 1x and 2x, as WebP with no metadata: no location, device or dates.
//
//   pnpm photo <file> [--crop left,top,size] [--preview <file.png>]
//
// With no crop, it takes the largest centered square. The preview is the crop
// at 400 px, for Brad's card before the files are committed.

const ROOT = path.resolve(import.meta.dirname, '..', '..')
export const FOLDER = path.join(ROOT, 'apps', 'site', 'public', 'photo')

/** The smallest source side the photo may come from (D164). */
export const MIN_SIDE = 400

/** The sizes the page serves: 64 and 76 px, and each at 2x. */
export const SIZES = [64, 76, 128, 152] as const

/** A square crop: its left and top edges and its side, in the source's pixels. */
export interface Crop {
  left: number
  top: number
  size: number
}

/** The largest centered square in a width × height picture. */
export function centered(width: number, height: number): Crop {
  const size = Math.min(width, height)
  return { left: Math.floor((width - size) / 2), top: Math.floor((height - size) / 2), size }
}

/** A "left,top,size" crop, checked against the source's size. */
export function parseCrop(text: string, width: number, height: number): Crop {
  const [left, top, size] = text.split(',').map(Number)
  if (![left, top, size].every((value) => Number.isInteger(value) && (value ?? -1) >= 0))
    throw new Error(`The crop "${text}" must be three whole numbers: left,top,size.`)
  const crop = { left: left ?? 0, top: top ?? 0, size: size ?? 0 }
  if (crop.size < MIN_SIDE) throw new Error(`The crop is ${crop.size} px; the photo needs at least ${MIN_SIDE} px square.`)
  if (crop.left + crop.size > width || crop.top + crop.size > height) throw new Error(`The crop runs past the ${width} × ${height} source.`)
  return crop
}

/** The file name of the photo at a size. */
export const fileOf = (size: number): string => `brad-${size}.webp`

/** Writes the photo's sizes into `folder`, from a source and a crop, and returns their names. */
export async function writePhoto(source: Buffer, crop: Crop, folder = FOLDER): Promise<string[]> {
  mkdirSync(folder, { recursive: true })
  const square = sharp(source).extract({ left: crop.left, top: crop.top, width: crop.size, height: crop.size })
  const names: string[] = []
  for (const size of SIZES) {
    // sharp writes no metadata unless asked to keep it, so the files carry none.
    const file = await square.clone().resize(size, size, { kernel: 'lanczos3' }).webp({ quality: 86, effort: 6 }).toBuffer()
    writeFileSync(path.join(folder, fileOf(size)), file)
    names.push(fileOf(size))
  }
  return names
}

async function main(args: readonly string[]): Promise<number> {
  const [file] = args
  if (file === undefined || file.startsWith('--')) {
    console.log('✖ photo  Give the source file: pnpm photo <file> [--crop left,top,size] [--preview <file.png>]')
    return 1
  }
  const source = await sharp(file).toBuffer()
  const { width = 0, height = 0 } = await sharp(source).metadata()
  if (Math.min(width, height) < MIN_SIDE) {
    console.log(`✖ photo  The source is ${width} × ${height}; the photo needs at least ${MIN_SIDE} px square (D164).`)
    return 1
  }
  const flag = (name: string): string | undefined => {
    const index = args.indexOf(name)
    return index === -1 ? undefined : args[index + 1]
  }
  const cropText = flag('--crop')
  const crop = cropText === undefined ? centered(width, height) : parseCrop(cropText, width, height)
  const names = await writePhoto(source, crop)
  const preview = flag('--preview')
  if (preview !== undefined) {
    await sharp(source)
      .extract({ left: crop.left, top: crop.top, width: crop.size, height: crop.size })
      .resize(400, 400)
      .png()
      .toFile(preview)
  }
  console.log(`✓ photo  ${crop.size} px square from ${crop.left},${crop.top} of ${width} × ${height}: ${names.join(', ')}`)
  return 0
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2))
