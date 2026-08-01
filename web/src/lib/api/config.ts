export const GENERATED_BASE_PATH = "http://localhost:5000"

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ApiConfigurationError"
  }
}

export function resolveApiBaseUrl(raw: string | undefined | null): string {
  const value = (raw ?? "").trim()
  if (value === "" || value === "/") return ""

  const withoutTrailingSlash = value.replace(/\/+$/, "")
  if (withoutTrailingSlash.startsWith("/")) return withoutTrailingSlash

  let parsed: URL
  try {
    parsed = new URL(withoutTrailingSlash)
  } catch {
    throw new ApiConfigurationError(
      `VITE_API_BASE_URL must be empty, a root-relative path, or an absolute URL. Received "${raw}".`
    )
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ApiConfigurationError(
      `VITE_API_BASE_URL must use http or https. Received "${raw}".`
    )
  }
  return withoutTrailingSlash
}

export const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL as string | undefined
)

export function resolveApiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`
  if (API_BASE_URL === "") {
    if (typeof window === "undefined") return suffix
    return `${window.location.origin}${suffix}`
  }
  if (API_BASE_URL.startsWith("/")) {
    const origin = typeof window === "undefined" ? "" : window.location.origin
    return `${origin}${API_BASE_URL}${suffix}`
  }
  return `${API_BASE_URL}${suffix}`
}
