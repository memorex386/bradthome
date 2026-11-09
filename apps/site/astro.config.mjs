import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, fontProviders } from 'astro/config'
import { prepDefine } from '../../scripts/site/release.ts'
import { resumePdfs } from '../../scripts/site/resume-pdfs.ts'

// The site (D37, D51, D92). React and Motion are ready for later islands; the
// empty page uses neither, so it ships no script. Astro's CSP hashes go in a
// meta tag on each page, and pnpm csp copies them into firebase.json's header.
// The fonts come from the Fontsource packages through the local provider, so
// the build never fetches a font and the site serves its own copies. Their
// size-adjusted fallbacks are in tokens.css rather than Astro's own, which
// name only Times New Roman and Arial, so the metric-compatible Liberation and
// Croscore fonts on Linux and ChromeOS get the same adjustment, and swapping to
// the real fonts doesn't re-wrap the text (spec 003's FR-004).
// Shiki writes each code token's colors into a style attribute, which the
// Content-Security-Policy blocks and html-validate refuses. This swaps each
// style for a class that essay.css colors per theme. Only the colors the
// essay's code uses get a class; any other token keeps the text color.
const SHIKI_CLASSES = { '--shiki-light:#E36209;--shiki-dark:#FFAB70': 'shiki-marker' }
const shikiClasses = {
  name: 'bradthome:shiki-classes',
  pre(node) {
    delete node.properties.style
  },
  span(node) {
    const name = SHIKI_CLASSES[String(node.properties.style ?? '')]
    delete node.properties.style
    if (name) this.addClassToHast(node, name)
  },
}

// A build is always production's. A test that builds the site inherits
// vitest's NODE_ENV=test, which makes React's JSX write each component's
// absolute source path, a machine path, into the chat's chunk (spec 022).
if (process.argv.includes('build')) process.env.NODE_ENV = 'production'

export default defineConfig({
  site: 'https://bradthome.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react(), mdx(), resumePdfs],
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false, transformers: [shikiClasses] },
  },
  // The link previews' script (spec 016, D147) ships as its own file from the
  // site, never inline, so the Content-Security-Policy gains no hash for it.
  vite: {
    plugins: [tailwindcss()],
    // A release build sets prep's constant false, so the window drops prep until v2.2 (spec 024, D190).
    define: prepDefine(),
    build: { assetsInlineLimit: (file) => (/previews\.client|PreviewLink\.astro/.test(file) ? false : undefined) },
  },
  security: { csp: true },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Charis SIL',
      cssVariable: '--font-charis',
      // tokens.css's size-adjusted fallback, then Georgia and the device's serif.
      fallbacks: ['Charis SIL fallback', 'Georgia', 'serif'],
      optimizedFallbacks: false,
      options: {
        variants: [
          { src: ['@fontsource/charis-sil/files/charis-sil-latin-400-normal.woff2'], weight: '400', style: 'normal', display: 'swap' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks: ['Inter fallback', 'Arial', 'sans-serif'],
      optimizedFallbacks: false,
      options: {
        variants: [
          { src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'], weight: '100 900', style: 'normal', display: 'swap' },
        ],
      },
    },
    // The design system's display and label fonts (spec 009's FR-002). Only
    // its layout loads them, so v1's pages don't (D121). Their size-adjusted
    // fallbacks are in styles/ds/tokens.css, for the same reason as above.
    {
      provider: fontProviders.local(),
      name: 'Inter Tight',
      cssVariable: '--font-inter-tight',
      fallbacks: ['Inter Tight fallback', 'Arial', 'sans-serif'],
      optimizedFallbacks: false,
      options: {
        variants: [
          {
            src: ['@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
            display: 'swap',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      fallbacks: ['JetBrains Mono fallback', 'Courier New', 'monospace'],
      optimizedFallbacks: false,
      options: {
        variants: [
          {
            src: ['@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2'],
            weight: '100 800',
            style: 'normal',
            display: 'swap',
          },
        ],
      },
    },
  ],
})
