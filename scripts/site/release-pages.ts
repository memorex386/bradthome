import { existsSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Phase 3's pages stay off live until v2.0 (D127). The release workflow builds
// with BRADTHOME_RELEASE=1, and this Astro integration then removes these pages
// from the build, so a v1.x release serves v1's pages only. Every other build,
// for CI, the previews and next, keeps them.

/** The built files of the pages phase 3 adds, as Hosting serves them from dist. */
export const PHASE_3_PAGES = ['v2.html', 'mobile.html', 'fullstack.html', 'ai.html', 'design-system.html'] as const

/** Whether this build is the release workflow's. */
export const isRelease = (env: NodeJS.ProcessEnv = process.env): boolean => env.BRADTHOME_RELEASE === '1'

/** Removes phase 3's pages from a built site, and returns the ones it removed. */
export function dropPhase3Pages(dist: string): string[] {
  const removed: string[] = []
  for (const page of PHASE_3_PAGES) {
    const file = path.join(dist, page)
    try {
      rmSync(file)
      removed.push(page)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  return removed
}

/**
 * Removes the link previews' files from a built site (spec 016): their images
 * in previews/ and their script in _astro/. Only phase 3's pages use them.
 * Returns what it removed.
 */
export function dropPhase3Assets(dist: string): string[] {
  const removed: string[] = []
  if (existsSync(path.join(dist, 'previews'))) {
    rmSync(path.join(dist, 'previews'), { recursive: true })
    removed.push('previews/')
  }
  const assets = path.join(dist, '_astro')
  if (existsSync(assets)) {
    for (const name of readdirSync(assets)) {
      if (!/^PreviewLink\.astro_astro_type_script/.test(name)) continue
      rmSync(path.join(assets, name))
      removed.push(`_astro/${name}`)
    }
  }
  return removed
}

/** The integration astro.config.mjs adds: on a release build, drop phase 3's pages once the build is done. */
export const releasePages = {
  name: 'bradthome:release-pages',
  hooks: {
    'astro:build:done': ({ dir, logger }: { dir: URL; logger: { info(message: string): void } }) => {
      if (!isRelease()) return
      const removed = dropPhase3Pages(fileURLToPath(dir))
      logger.info(`A release build leaves out phase 3's pages (D127): ${removed.join(', ') || 'none were built'}.`)
      const assets = dropPhase3Assets(fileURLToPath(dir))
      logger.info(`It leaves out the link previews' files too (spec 016): ${assets.join(', ') || 'none were built'}.`)
    },
  },
}
