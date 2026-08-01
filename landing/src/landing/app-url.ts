const APP_ORIGIN: string | undefined = import.meta.env.PUBLIC_APP_URL

export function appUrl(path: string): string {
  if (!APP_ORIGIN) {
    throw new Error(
      "PUBLIC_APP_URL is missing — set it in landing/.env (dev) or the build environment (prod)."
    )
  }
  return new URL(path, APP_ORIGIN).href
}
