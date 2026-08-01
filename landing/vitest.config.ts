import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const webSrc = fileURLToPath(new URL("../web/src", import.meta.url))

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${webSrc}/` }],
  },
})
