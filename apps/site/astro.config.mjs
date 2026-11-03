import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, fontProviders } from 'astro/config'

// The site (D37, D51, D92). React and Motion are ready for later islands; the
// empty page uses neither, so it ships no script. Astro's CSP hashes go in a
// meta tag on each page, and pnpm csp copies them into firebase.json's header.
// The fonts come from the Fontsource packages through the local provider, so
// the build never fetches a font and the site serves its own copies.
export default defineConfig({
  site: 'https://bradthome.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  security: { csp: true },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Charis SIL',
      cssVariable: '--font-charis',
      fallbacks: ['Georgia', 'serif'],
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
      fallbacks: ['Arial', 'sans-serif'],
      options: {
        variants: [
          { src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'], weight: '100 900', style: 'normal', display: 'swap' },
        ],
      },
    },
  ],
})
