import { memo } from "react"
import { cjk } from "@streamdown/cjk"
import { math } from "@streamdown/math"
import { Streamdown, type PluginConfig } from "streamdown"

import "katex/dist/katex.min.css"

import { cn } from "@/lib/utils"

import { markdownComponents } from "./markdown-components"
import { markdownUrlTransform } from "./markdown-url"

const PLUGINS: PluginConfig = { cjk, math }

export interface ResponseProps {
  children: string
  streaming?: boolean
  className?: string
}

export const Response = memo(
  function Response({ children, streaming = false, className }: ResponseProps) {
    return (
      <div
        data-slot="markdown"
        className={cn(
          "min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
      >
        <Streamdown
          mode={streaming ? "streaming" : "static"}
          parseIncompleteMarkdown
          controls={false}
          lineNumbers={false}
          components={markdownComponents}
          urlTransform={markdownUrlTransform}
          plugins={PLUGINS}
          isAnimating={streaming}
        >
          {children}
        </Streamdown>
      </div>
    )
  },
  (previous, next) =>
    previous.children === next.children &&
    previous.streaming === next.streaming &&
    previous.className === next.className
)
