import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { useBaseCurrency } from "@/auth"
import { formatTimeStamp } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ai-elements"
import { Figure } from "@/components/figure"
import { focusRing, FoldRow, Truncate } from "@/components/primitives"

import {
  answerCardTsv,
  ANSWER_ROWS_DRAWN,
  ledgerUnappliedNote,
  type AnswerCard as AnswerCardModel,
  type AnswerFigure,
  type AnswerRow,
} from "../api"
import {
  COPY_ANSWER_TABLE,
  OPEN_IN_LEDGER,
  PIN,
  REFINE_LABEL,
  REFINE_NOTE,
  UNPIN,
} from "../copy"

const PILL =
  "rounded-full border border-border-strong px-[11px] py-[6px] text-[11.5px] leading-none font-medium text-ink-2 whitespace-nowrap transition-colors duration-instant ease-out-quick hover:bg-surface-2"

function AnswerFigureView({
  figure,
  className,
  size = "base",
}: {
  figure: AnswerFigure
  className?: string
  size?: "lg" | "base"
}) {
  const shared = {
    value: figure.value,
    size,
    sign: figure.signed ? ("always" as const) : ("auto" as const),
    className,
  }
  if (figure.kind === "money") {
    return <Figure {...shared} kind="money" currency={figure.currency} />
  }
  if (figure.kind === "units") {
    return <Figure {...shared} kind="units" ticker={figure.ticker ?? null} />
  }
  return <Figure {...shared} kind="plain" decimals={0} />
}

function AnswerRowView({ row }: { row: AnswerRow }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-[13px] py-[9px] last:border-b-0 sm:grid-cols-[1fr_84px_auto]">
      <span className="min-w-0">
        <Truncate
          text={row.label}
          className="block text-[12px] leading-[1.3] font-medium"
        />
        {row.meta === null || row.meta === "" ? null : (
          <Truncate
            text={row.meta}
            className="block text-[11px] leading-[1.4] text-ink-3"
          />
        )}
      </span>
      <span className="hidden text-right sm:block">
        {row.count === null ? null : (
          <Figure
            value={row.count}
            kind="plain"
            decimals={0}
            size="micro"
            intent="meta"
          />
        )}
      </span>
      <AnswerFigureView figure={row.figure} />
    </div>
  )
}

export function AnswerCardView({
  card,
  pinned,
  onPin,
  onRefine,
}: {
  card: AnswerCardModel
  pinned: boolean
  onPin: () => void
  onRefine: (prompt: string) => void
}) {
  const baseCurrency = useBaseCurrency()
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? card.rows.length : ANSWER_ROWS_DRAWN
  const rows = card.rows.slice(0, shown)
  const unapplied =
    card.ledger === null ? null : ledgerUnappliedNote(card.ledger)

  return (
    <section
      data-slot="myra-answer"
      data-testid="answer"
      className="min-w-0 overflow-hidden rounded-panel border border-border bg-surface"
    >
      <div className="px-[18px] pt-4 pb-[15px]">
        <h3 className="text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
          {card.label}
        </h3>
        <div className="mt-3 flex flex-wrap items-end gap-x-[14px] gap-y-2">
          {card.headline === null ? null : (
            <AnswerFigureView
              figure={card.headline}
              size="lg"
              className="text-[30px] tracking-[-0.03em]"
            />
          )}
          <p className="min-w-0 pb-1 text-[12px] leading-[1.5] text-pretty text-ink-2">
            {card.headlineNote}
          </p>
        </div>

        {card.rows.length === 0 ? null : (
          <div className="mt-[15px] overflow-hidden rounded-md border border-border">
            {rows.map((row) => (
              <AnswerRowView key={row.key} row={row} />
            ))}
          </div>
        )}
        {card.rows.length > ANSWER_ROWS_DRAWN && !showAll ? (
          <FoldRow
            variant="panel"
            total={card.rows.length}
            shown={ANSWER_ROWS_DRAWN}
            mode="remainder"
            actionLabel="Show all"
            onShowAll={() => {
              setShowAll(true)
            }}
            className="mt-[10px]"
          />
        ) : null}
      </div>

      {card.refinements.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-2 px-[18px] pb-[15px]">
          <span
            className="mr-0.5 text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase"
            title={REFINE_NOTE}
          >
            {REFINE_LABEL}
          </span>
          {card.refinements.map((refinement) => (
            <button
              key={refinement.id}
              type="button"
              onClick={() => {
                onRefine(refinement.prompt)
              }}
              className={cn(PILL, focusRing.pill)}
            >
              {refinement.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-surface-2 px-[18px] py-[11px]">
        <span className="min-w-0 flex-1 font-mono text-[10.5px] leading-[1.4] text-ink-3">
          {[
            card.provenance.tool,
            ...card.provenance.facts,
            `read ${formatTimeStamp(card.provenance.at)}`,
          ].join(" · ")}
        </span>
        {card.ledger === null ? null : (
          <Link
            to="/transactions"
            search={{ mode: "explore" as const, ...card.ledger.search }}
            title={unapplied ?? undefined}
            className={cn(
              "flex-none text-[11px] leading-none font-semibold whitespace-nowrap text-brand",
              focusRing.chip
            )}
          >
            {OPEN_IN_LEDGER}
          </Link>
        )}
        <button
          type="button"
          onClick={onPin}
          aria-pressed={pinned}
          className={cn(
            "flex-none text-[11px] leading-none font-semibold whitespace-nowrap text-ink-2",
            focusRing.chip
          )}
        >
          {pinned ? UNPIN : PIN}
        </button>
        <CopyButton
          value={() => answerCardTsv(card, baseCurrency)}
          label={COPY_ANSWER_TABLE}
          className="-my-1 flex-none"
        />
      </div>

      {card.footnote === null && unapplied === null ? null : (
        <p className="border-t border-border bg-surface-2 px-[18px] py-[11px] text-[11px] leading-[1.5] text-pretty text-ink-3">
          {[card.footnote, unapplied].filter((part) => part !== null).join(" ")}
        </p>
      )}
    </section>
  )
}
