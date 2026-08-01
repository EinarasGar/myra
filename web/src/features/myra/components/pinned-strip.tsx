import { formatTimeStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Figure } from "@/components/figure"
import { focusRing, HIT_TARGET, Truncate } from "@/components/primitives"

import { comparablePins, type AnswerCard } from "../api"
import { PIN_COMPARE_REFUSAL, PINNED_LABEL, PINS_NOTE, UNPIN } from "../copy"

export function PinnedStrip({
  pins,
  onUnpin,
}: {
  pins: readonly AnswerCard[]
  onUnpin: (id: string) => void
}) {
  if (pins.length === 0) return null
  const comparison = comparablePins(pins)

  return (
    <section
      data-slot="myra-pins"
      aria-label={PINNED_LABEL}
      className="flex flex-wrap items-stretch gap-[10px] border-b border-border bg-surface-2 px-4 py-[14px] lg:px-7"
    >
      {pins.map((pin) => (
        <article
          key={pin.id}
          className="min-w-[180px] flex-1 rounded-md border border-border bg-surface px-[13px] py-[11px]"
        >
          <div className="flex items-baseline gap-2">
            <h3 className="min-w-0 text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
              <Truncate text={pin.label} className="block" />
            </h3>
            <button
              type="button"
              aria-label={`${UNPIN} ${pin.label}`}
              onClick={() => {
                onUnpin(pin.id)
              }}
              className={cn(
                "ms-auto flex-none text-[10px] leading-none text-ink-3",
                HIT_TARGET,
                focusRing.chip
              )}
            >
              ✕
            </button>
          </div>
          {pin.headline === null ? (
            <Figure value={null} className="mt-[9px] block" size="md" />
          ) : (
            <Figure
              value={pin.headline.value}
              kind={pin.headline.kind === "plain" ? "plain" : pin.headline.kind}
              {...(pin.headline.currency === undefined
                ? {}
                : { currency: pin.headline.currency })}
              {...(pin.headline.ticker === undefined
                ? {}
                : { ticker: pin.headline.ticker })}
              sign={pin.headline.signed ? "always" : "auto"}
              size="md"
              className="mt-[9px] block"
            />
          )}
          <Truncate
            text={`${pin.provenance.tool} · ${formatTimeStamp(pin.provenance.at)}`}
            className="mt-[6px] block font-mono text-[10.5px] leading-[1.4] text-ink-3"
          />
        </article>
      ))}

      <article className="flex w-full flex-none flex-col justify-center rounded-md border border-dashed border-border-strong px-[13px] py-[11px] sm:w-[184px]">
        {comparison.difference === null ? (
          <p className="text-[10.5px] leading-[1.5] text-pretty text-ink-3">
            {pins.length === 2 ? PIN_COMPARE_REFUSAL : PINS_NOTE}
          </p>
        ) : (
          <>
            <span className="flex items-baseline gap-1.5 text-[11px] leading-[1.3] font-semibold text-ink-2">
              Second minus first
              <Figure
                value={comparison.difference}
                kind="money"
                currency={comparison.currency ?? undefined}
                intent="gainLoss"
                size="micro"
              />
            </span>
            <p className="mt-[6px] text-[10.5px] leading-[1.5] text-pretty text-ink-3">
              {PINS_NOTE}
            </p>
          </>
        )}
      </article>
    </section>
  )
}
