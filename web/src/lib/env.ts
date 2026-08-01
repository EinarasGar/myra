import { z } from "zod"

import { API_BASE_URL } from "./api/config"

export const AUTH_PROVIDER_MODES = ["noauth", "database", "clerk"] as const

const authConfigSchema = z
  .object({
    authProvider: z.enum(AUTH_PROVIDER_MODES),
    clerkPublishableKey: z.string(),
  })
  .refine(
    (config) =>
      config.authProvider !== "clerk" || config.clerkPublishableKey.length > 0,
    {
      path: ["clerkPublishableKey"],
      error: 'CLERK_PUBLISHABLE_KEY is required when AUTH_PROVIDER is "clerk"',
    }
  )

export interface AppEnv extends z.infer<typeof authConfigSchema> {
  apiBaseUrl: string
}

function loadEnv(): AppEnv {
  const result = authConfigSchema.safeParse({
    authProvider: import.meta.env.AUTH_PROVIDER,
    clerkPublishableKey: import.meta.env.CLERK_PUBLISHABLE_KEY ?? "",
  })
  if (!result.success) {
    throw new Error(
      `Invalid frontend configuration read from the repo-root .env. Run "make setup-env".\n${z.prettifyError(result.error)}`
    )
  }
  return { ...result.data, apiBaseUrl: API_BASE_URL }
}

export const env = loadEnv()
