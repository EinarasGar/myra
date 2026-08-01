import { useEffect, useId, useState, useSyncExternalStore } from "react"

import { CodeBlock } from "./code-block"
import { CopyButton } from "./copy-button"

const DIAGRAM_LANGUAGE = "mermaid"

function subscribeToColourScheme(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {}
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => {
    observer.disconnect()
  }
}

function readIsDark(): boolean {
  return document.documentElement.classList.contains("dark")
}

function readIsDarkOnServer(): boolean {
  return false
}

export function MermaidDiagram({ source }: { source: string }) {
  const isDark = useSyncExternalStore(
    subscribeToColourScheme,
    readIsDark,
    readIsDarkOnServer
  )
  const [drawn, setDrawn] = useState<{
    key: string
    svg: string | null
  } | null>(null)
  const id = useId().replace(/:/g, "")
  const key = `${isDark ? "dark" : "light"} ${source}`

  useEffect(() => {
    let live = true
    const draw = async () => {
      try {
        const { default: mermaid } = await import("mermaid")
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: isDark ? "dark" : "default",
        })
        const rendered = await mermaid.render(`myra-diagram-${id}`, source)
        if (live) setDrawn({ key, svg: rendered.svg })
      } catch {
        if (live) setDrawn({ key, svg: null })
      }
    }
    void draw()
    return () => {
      live = false
    }
  }, [source, isDark, id, key])

  const current = drawn?.key === key ? drawn : null
  const svg = current?.svg ?? null

  if (current !== null && svg === null) {
    return <CodeBlock code={source} language={DIAGRAM_LANGUAGE} />
  }

  return (
    <figure
      data-slot="markdown-diagram"
      className="my-3 min-w-0 overflow-hidden rounded-md border border-border bg-surface"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 py-[5px] pr-[5px] pl-[13px]">
        <span className="font-mono text-[10px] leading-none font-medium tracking-[0.1em] text-ink-3 uppercase">
          {DIAGRAM_LANGUAGE}
        </span>
        <CopyButton value={source} label="Copy diagram source" />
      </div>
      {svg === null ? (
        <p className="px-[14px] py-[11px] text-[12px] leading-[1.6] text-ink-3">
          Drawing the diagram…
        </p>
      ) : (
        <div
          className="min-w-0 overflow-x-auto px-[14px] py-[13px] [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </figure>
  )
}
