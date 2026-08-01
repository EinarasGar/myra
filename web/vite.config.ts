import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const AUTH_PROVIDERS = ["noauth", "database", "clerk"] as const

type AuthProvider = (typeof AUTH_PROVIDERS)[number]
type RawEnv = Record<string, string | undefined>

const srcDir = fileURLToPath(new URL("./src", import.meta.url))
const repoRoot = fileURLToPath(new URL("..", import.meta.url))

function required(env: RawEnv, key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(
      `${key} is missing from ${repoRoot}.env — run "make setup-env" first.`
    )
  }
  return value
}

function readAuthProvider(env: RawEnv): AuthProvider {
  const value = required(env, "AUTH_PROVIDER")
  const provider = AUTH_PROVIDERS.find((candidate) => candidate === value)
  if (!provider) {
    throw new Error(
      `AUTH_PROVIDER="${value}" is not one of ${AUTH_PROVIDERS.join(", ")}.`
    )
  }
  return provider
}

export default defineConfig(({ command, mode }) => {
  const env: RawEnv = loadEnv(mode, repoRoot, "")
  const authProvider = readAuthProvider(env)
  if (authProvider === "clerk") {
    required(env, "CLERK_PUBLISHABLE_KEY")
  }

  return {
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    envDir: repoRoot,
    envPrefix: ["VITE_", "AUTH_PROVIDER", "CLERK_PUBLISHABLE_KEY"],
    resolve: {
      alias: [
        {
          find: "@/auth/provider",
          replacement: `${srcDir}/auth/impl/${authProvider}`,
        },
        { find: "@", replacement: srcDir },
      ],
    },
    server:
      command === "serve"
        ? {
            port: Number(required(env, "VITE_PORT")),
            strictPort: true,
            proxy: {
              "/api": `http://127.0.0.1:${required(env, "SERVER_PORT")}`,
            },
          }
        : undefined,
  }
})
