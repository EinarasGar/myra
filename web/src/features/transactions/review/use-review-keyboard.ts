import { useEffect, useRef } from "react"

export interface ReviewKeyboardHandlers {
  onConfirm: () => void
  onEdit: () => void
  onSkip: () => void
  onDelete: () => void
  onNext: () => void
  onPrevious: () => void
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (TYPING_TAGS.has(target.tagName)) return true
  return target.isContentEditable === true
}

export function reviewKeyAction(
  event: KeyboardEvent
): keyof ReviewKeyboardHandlers | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  switch (event.key) {
    case "Enter":
      return "onConfirm"
    case "e":
    case "E":
      return "onEdit"
    case "ArrowRight":
      return "onSkip"
    case "Backspace":
    case "Delete":
      return "onDelete"
    case "j":
    case "ArrowDown":
      return "onNext"
    case "k":
    case "ArrowUp":
      return "onPrevious"
    default:
      return null
  }
}

export function useReviewKeyboard(
  handlers: ReviewKeyboardHandlers,
  enabled: boolean
): void {
  const latest = useRef(handlers)

  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (isTypingTarget(event.target)) return
      const action = reviewKeyAction(event)
      if (action === null) return
      event.preventDefault()
      latest.current[action]()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [enabled])
}
