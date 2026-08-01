import { describe, expect, it } from "vitest"

import {
  isExternalHref,
  markdownUrlTransform,
  safeImageSrc,
  safeLinkHref,
} from "./markdown-url"

describe("link hardening", () => {
  it("refuses script-bearing protocols whatever the casing or padding", () => {
    expect(safeLinkHref("javascript:alert(1)")).toBeNull()
    expect(safeLinkHref("  JavaScript:alert(1)")).toBeNull()
    expect(safeLinkHref("vbscript:msgbox")).toBeNull()
    expect(safeLinkHref("data:text/html;base64,PHNjcmlwdD4=")).toBeNull()
    expect(safeLinkHref("")).toBeNull()
  })

  it("keeps http, https, mailto and in-app destinations", () => {
    expect(safeLinkHref("https://sverto.com/help")).toBe(
      "https://sverto.com/help"
    )
    expect(safeLinkHref("mailto:hi@sverto.com")).toBe("mailto:hi@sverto.com")
    expect(safeLinkHref("/transactions?q=tesco")).toBe("/transactions?q=tesco")
    expect(safeLinkHref("#footnote-1")).toBe("#footnote-1")
  })

  it("treats another origin as external and the app's own paths as internal", () => {
    expect(isExternalHref("https://example.com/x")).toBe(true)
    expect(isExternalHref("mailto:hi@sverto.com")).toBe(true)
    expect(isExternalHref("/portfolio")).toBe(false)
    expect(isExternalHref("#top")).toBe(false)
    expect(isExternalHref(`${window.location.origin}/portfolio`)).toBe(false)
  })

  it("allows only http(s) and inline image data for image sources", () => {
    expect(safeImageSrc("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png"
    )
    expect(safeImageSrc("data:image/png;base64,AAAA")).toBe(
      "data:image/png;base64,AAAA"
    )
    expect(safeImageSrc("data:text/html,<script>")).toBeNull()
    expect(safeImageSrc("javascript:alert(1)")).toBeNull()
  })

  it("routes src through the image rules and everything else through the link rules", () => {
    expect(markdownUrlTransform("data:image/png;base64,AA", "src")).toBe(
      "data:image/png;base64,AA"
    )
    expect(markdownUrlTransform("data:image/png;base64,AA", "href")).toBeNull()
  })
})
