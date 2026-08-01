import { toast } from "@/components/ui/toast"

const REVERSIBLE_TIMEOUT_MS = 6000

export function valuationAddedToast(input: {
  amount: string
  stamp: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Valuation added",
    description: `${input.amount} on ${input.stamp}. Every total that holds this asset has moved.`,
    actionProps: { children: "Undo", onClick: input.onUndo },
  })
}

export function valuationRemovedToast(input: {
  stamp: string
  onUndo: () => void
}): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Valuation removed",
    description: `The ${input.stamp} valuation is gone, so totals on and after that date fall back to the one before it.`,
    actionProps: { children: "Undo", onClick: input.onUndo },
  })
}

export function valuationRestoredToast(stamp: string): void {
  toast.add({
    type: "info",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Back where it was",
    description: `The ${stamp} valuation is in place again.`,
  })
}

export function pairAddedToast(ticker: string): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Pair added",
    description: `You can now value this asset in ${ticker}.`,
  })
}

export function pairRemovedToast(ticker: string): void {
  toast.add({
    type: "success",
    timeout: REVERSIBLE_TIMEOUT_MS,
    title: "Pair removed",
    description: `The ${ticker} pair and every valuation you entered against it are gone. Removing a pair cannot be undone.`,
  })
}
