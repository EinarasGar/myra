import { countOf } from "@/lib/format"

import type { ChatPart, ErrorPart, ProposalPart, ToolPart } from "./types"

export type TurnBlock =
  | { readonly kind: "text"; readonly id: string; readonly text: string }
  | { readonly kind: "reasoning"; readonly id: string; readonly text: string }
  | {
      readonly kind: "work"
      readonly id: string
      readonly steps: readonly ToolPart[]
    }
  | {
      readonly kind: "proposal"
      readonly id: string
      readonly proposal: ProposalPart
    }
  | { readonly kind: "error"; readonly id: string; readonly error: ErrorPart }

export function layoutTurn(parts: readonly ChatPart[]): readonly TurnBlock[] {
  const blocks: TurnBlock[] = []
  let work: ToolPart[] = []

  const flush = () => {
    if (work.length === 0) return
    blocks.push({
      kind: "work",
      id: `work:${work[0]?.callId ?? ""}`,
      steps: work,
    })
    work = []
  }

  parts.forEach((part, index) => {
    if (part.kind === "tool") {
      work.push(part)
      return
    }
    flush()
    switch (part.kind) {
      case "text":
        if (part.text.trim() !== "") {
          blocks.push({
            kind: "text",
            id: `text:${String(index)}`,
            text: part.text,
          })
        }
        break
      case "reasoning":
        if (part.text.trim() !== "") {
          blocks.push({
            kind: "reasoning",
            id: `reasoning:${String(index)}`,
            text: part.text,
          })
        }
        break
      case "proposal":
        blocks.push({
          kind: "proposal",
          id: `proposal:${part.toolCallId}`,
          proposal: part,
        })
        break
      case "error":
        blocks.push({
          kind: "error",
          id: `error:${String(index)}`,
          error: part,
        })
        break
    }
  })

  flush()
  return blocks
}

export function workSummary(steps: readonly ToolPart[]): {
  title: string
  meta: string
  running: boolean
  failed: boolean
} {
  const running = steps.some((step) => step.phase === "running")
  const failed = steps.some((step) => step.phase === "failed")
  const names = [...new Set(steps.map((step) => step.name))]
  const title =
    names.length === 1 ? (names[0] ?? "") : `${String(steps.length)} tool calls`
  const meta = names.length === 1 ? countPhrase(steps.length) : names.join(", ")
  return { title, meta, running, failed }
}

function countPhrase(count: number): string {
  return countOf(count, "call")
}
