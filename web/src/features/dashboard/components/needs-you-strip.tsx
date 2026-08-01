import { Link } from "@tanstack/react-router"

import { Figure } from "@/components/figure"
import { focusRing } from "@/components/primitives"
import { mockAttributes, MockBadge } from "@/lib/mock"
import { cn } from "@/lib/utils"

import type { NeedsYou } from "../api"

export function NeedsYouStrip({ needsYou }: { needsYou: NeedsYou }) {
  if (needsYou.items.length === 0) return null

  const marker = needsYou.mockId === null ? {} : mockAttributes(needsYou.mockId)

  return (
    <section
      data-slot="needs-you"
      aria-label="Needs you"
      className="mt-[26px] flex flex-wrap items-center gap-x-3 gap-y-[10px] rounded-panel border border-attention bg-attention-dim px-4 py-[13px]"
      {...marker}
    >
      <h2 className="flex-none text-[12.5px] leading-none font-bold whitespace-nowrap text-attention">
        Needs you
      </h2>
      {needsYou.mockId === null ? null : <MockBadge id={needsYou.mockId} />}
      <span aria-hidden className="h-4 w-px flex-none bg-border-strong" />

      <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        {needsYou.items.map((item) => (
          <li
            key={item.key}
            data-slot="needs-you-item"
            className="flex items-center gap-[7px] whitespace-nowrap"
          >
            <item.icon
              aria-hidden
              className="size-[13px] flex-none stroke-[1.8] text-ink-3"
            />
            <Figure
              value={item.count}
              kind="plain"
              intent="secondary"
              size="micro"
            />
            {item.isLowerBound ? (
              <span aria-hidden className="-ms-[5px] text-[12px] text-ink-2">
                +
              </span>
            ) : null}
            <span className="text-[12px] leading-none text-ink-2">
              {item.label}
            </span>
            {item.isLowerBound ? (
              <span className="sr-only">
                or more — only the ledger read so far has been counted
              </span>
            ) : null}
            {item.mockId === null ? null : (
              <span className="sr-only">(example data)</span>
            )}
          </li>
        ))}
      </ul>

      {needsYou.isLowerBound ? (
        <p
          data-slot="needs-you-floor"
          className="min-w-0 text-[11px] leading-[1.4] text-pretty text-ink-3"
        >
          Counted over the ledger read so far — more may be waiting further
          back.
        </p>
      ) : null}

      <Link
        to="/transactions"
        search={{ mode: "review" }}
        className={cn(
          "ms-auto flex-none rounded-sm border border-attention px-[13px] py-[7px] text-[11.5px] leading-none font-semibold whitespace-nowrap text-attention outline-none",
          focusRing.sm
        )}
      >
        Review them →
      </Link>
    </section>
  )
}
