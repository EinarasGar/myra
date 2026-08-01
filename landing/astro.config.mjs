// @ts-check
import { defineConfig } from "astro/config"

import react from "@astrojs/react"

import tailwindcss from "@tailwindcss/vite"

import sitemap from "@astrojs/sitemap"

import { fileURLToPath } from "node:url"

const siteUrl = process.env.PUBLIC_SITE_URL
if (!siteUrl) {
  throw new Error(
    'PUBLIC_SITE_URL is missing — canonical URLs and the sitemap are built from it. Use "make landing-run" or "make landing-build".'
  )
}

const webSrc = fileURLToPath(new URL("../web/src", import.meta.url))

// Sources under web/src resolve their bare imports against web/node_modules, which holds a
// second copy of React from the one this project renders with. Two copies means null hooks.
const SHARED_RUNTIME = [
  "react",
  "react-dom",
  "@base-ui/react",
  "@base-ui/utils",
]

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  output: "static",
  integrations: [react(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [{ find: /^@\//, replacement: `${webSrc}/` }],
      dedupe: SHARED_RUNTIME,
    },
    environments: {
      ssr: { resolve: { dedupe: SHARED_RUNTIME } },
    },
  },
})
