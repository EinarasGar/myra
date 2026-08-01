import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

import viteConfig from "./vite.config.ts"

const { envDir, envPrefix, resolve } = viteConfig({
  command: "serve",
  mode: "test",
})

export default defineConfig({
  plugins: [react()],
  envDir,
  envPrefix,
  resolve,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/api/**",
        "src/routeTree.gen.ts",
        "src/components/ui/**",
        "src/test/**",
        "src/**/*.{test,spec}.{ts,tsx}",
      ],
    },
  },
})
