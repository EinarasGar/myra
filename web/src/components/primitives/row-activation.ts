import type { KeyboardEvent, MouseEvent } from "react"

import { focusRing } from "./focus-ring"

const NESTED_CONTROL = "button,input,label,a,[role='checkbox']"

export const ROW_ACTIVATION_CLASS =
  `cursor-pointer transition-colors duration-instant ease-out-quick outline-hidden hover:bg-surface-2 ${focusRing.row}` as const

function fromNestedControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(NESTED_CONTROL) !== null
}

export function rowActivation<T extends HTMLElement>(activate: () => void) {
  return {
    tabIndex: 0,
    onClick: (event: MouseEvent<T>) => {
      if (fromNestedControl(event.target)) return
      activate()
    },
    onKeyDown: (event: KeyboardEvent<T>) => {
      if (event.key !== "Enter" && event.key !== " ") return
      if (fromNestedControl(event.target)) return
      event.preventDefault()
      activate()
    },
  }
}
