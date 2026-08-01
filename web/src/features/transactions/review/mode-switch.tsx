import { useNavigate } from "@tanstack/react-router"

import { useUserId } from "@/auth"
import { navBadgeLabel } from "@/components/layout/navigation"
import { SegmentedControl } from "@/components/primitives"
import { mockMarkerProps } from "@/lib/mock"

import { useReviewItems } from "./api"

export type LedgerMode = "explore" | "review"

/**
 * The badge reads the queue the Review screen itself renders, so the two counts on this page
 * cannot disagree; it is a lower bound whenever the ledger has more pages, which the screen
 * states in full.
 */
export function ModeSwitch({ mode }: { mode: LedgerMode }) {
  const navigate = useNavigate()
  const userId = useUserId()
  const queue = useReviewItems(userId)
  const mockId = queue.view.mockIds[0] ?? null
  const isLowerBound = queue.view.countIsLowerBound

  return (
    <SegmentedControl
      value={mode}
      label="Ledger mode"
      radius="button"
      onValueChange={(next) => {
        void navigate({
          to: "/transactions",
          search: (previous) => ({ ...previous, mode: next }),
        })
      }}
      options={[
        { value: "explore", label: "Explore" },
        {
          value: "review",
          label: <span {...mockMarkerProps(mockId)}>Review</span>,
          ...(queue.isPending
            ? {}
            : {
                count: queue.view.count,
                countIsLowerBound: isLowerBound,
                ariaLabel: navBadgeLabel(
                  "Review",
                  queue.view.count,
                  mockId !== null,
                  isLowerBound
                ),
              }),
          tone: "attention",
        },
      ]}
    />
  )
}
