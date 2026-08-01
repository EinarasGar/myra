import { useCallback, useEffect, useRef, useState } from "react"

export type CopyState = "idle" | "copied" | "failed"

const RESET_AFTER = 1800

async function writeToClipboard(value: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(value)
    return
  }
  throw new Error("Clipboard is unavailable")
}

export function useCopyToClipboard(resetAfter: number = RESET_AFTER): {
  state: CopyState
  copy: (value: string) => Promise<boolean>
} {
  const [state, setState] = useState<CopyState>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    []
  )

  const copy = useCallback(
    async (value: string) => {
      if (timer.current !== null) clearTimeout(timer.current)
      let copied = true
      try {
        await writeToClipboard(value)
      } catch {
        copied = false
      }
      setState(copied ? "copied" : "failed")
      timer.current = setTimeout(() => {
        setState("idle")
      }, resetAfter)
      return copied
    },
    [resetAfter]
  )

  return { state, copy }
}
