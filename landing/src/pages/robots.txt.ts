import type { APIRoute } from "astro"

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
]

export const GET: APIRoute = ({ site }) => {
  const aiPolicy = AI_CRAWLERS.map((agent) => `User-agent: ${agent}`).join("\n")
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    aiPolicy,
    "Allow: /",
    "",
    `Sitemap: ${new URL("sitemap-index.xml", site).href}`,
    "",
  ].join("\n")
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
