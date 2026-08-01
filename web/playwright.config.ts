import { defineConfig, devices } from "@playwright/test"

import { readRepoEnv } from "./e2e/support/env"

const PORT = readRepoEnv().vitePort
const BASE_URL = `http://localhost:${String(PORT)}`

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/.capture/**",
  outputDir: "./e2e/.artifacts",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tight",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1120, height: 900 },
      },
    },
    {
      name: "stacked",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 860, height: 900 },
      },
    },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `bun run dev --port ${String(PORT)}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
