const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"])
const IMAGE_PROTOCOLS = new Set(["http:", "https:"])
const IMAGE_DATA_PREFIX = "data:image/"

function pageOrigin(): string {
  if (typeof window === "undefined") return "http://localhost/"
  return window.location.origin
}

function isInPageReference(value: string): boolean {
  return value.startsWith("#")
}

function isAppPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//")
}

function parse(value: string): URL | null {
  try {
    return new URL(value, pageOrigin())
  } catch {
    return null
  }
}

export function safeLinkHref(href: string): string | null {
  const value = href.trim()
  if (value === "") return null
  if (isInPageReference(value) || isAppPath(value)) return value
  const parsed = parse(value)
  if (parsed === null) return null
  return LINK_PROTOCOLS.has(parsed.protocol) ? parsed.href : null
}

export function safeImageSrc(src: string): string | null {
  const value = src.trim()
  if (value === "") return null
  if (value.toLowerCase().startsWith(IMAGE_DATA_PREFIX)) return value
  if (isAppPath(value)) return value
  const parsed = parse(value)
  if (parsed === null) return null
  return IMAGE_PROTOCOLS.has(parsed.protocol) ? parsed.href : null
}

export function isExternalHref(href: string): boolean {
  if (isInPageReference(href) || isAppPath(href)) return false
  const parsed = parse(href)
  if (parsed === null) return false
  if (parsed.protocol === "mailto:") return true
  return parsed.origin !== pageOrigin()
}

export function markdownUrlTransform(
  url: string,
  key: string
): string | null | undefined {
  return key === "src" ? safeImageSrc(url) : safeLinkHref(url)
}
