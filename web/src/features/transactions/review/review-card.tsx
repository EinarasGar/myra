import { Sparkle } from "lucide-react"

import { MockBadge, mockAttributes } from "@/lib/mock"
import { cn } from "@/lib/utils"
import { HIT_TARGET_ROW, Truncate } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { useHasKeyboardAffordances } from "@/components/layout/breakpoints"

import type { ReviewAction, ReviewItem } from "./api"
import { ReviewAmount } from "./review-figure"

function KeyBadge({
  children,
  onFilled = false,
}: {
  children: React.ReactNode
  onFilled?: boolean
}) {
  const visible = useHasKeyboardAffordances()
  if (!visible) return null
  return (
    <span
      aria-hidden
      data-slot="key-badge"
      className={cn(
        "font-mono text-[10px] leading-none font-semibold",
        onFilled ? "opacity-70" : "text-ink-3"
      )}
    >
      {children}
    </span>
  )
}

function SourceChip({ item }: { item: ReviewItem }) {
  return (
    <span
      data-slot="review-source"
      className="inline-flex items-center gap-[6px] rounded-chip border border-border-strong px-[7px] py-[5px] text-[10px] leading-none font-semibold tracking-[0.07em] text-ghost uppercase"
    >
      <span aria-hidden className="font-mono">
        {item.glyph}
      </span>
      {item.sourceLabel}
    </span>
  )
}

function FieldGrid({ item }: { item: ReviewItem }) {
  return (
    <dl
      data-slot="review-fields"
      className="mt-[18px] grid grid-cols-1 gap-px overflow-hidden rounded-button border border-border bg-border sm:grid-cols-3"
    >
      {item.fields.map((field) => (
        <div key={field.key} className="bg-surface px-[13px] py-[11px]">
          <dt className="text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
            {field.label}
          </dt>
          <dd className="mt-[7px] text-[12.5px] leading-[1.3] font-medium">
            <Truncate className="block">{field.value}</Truncate>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function CategoryRow({ item }: { item: ReviewItem }) {
  return (
    <div data-slot="review-category" className="mt-[14px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="me-[2px] text-[10px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
          Category
        </span>
        {item.category.current === null ? (
          <span className="text-[11.5px] leading-none text-ink-3">
            None set
          </span>
        ) : (
          <span className="inline-flex items-center gap-[6px] rounded-sm bg-brand px-[10px] py-[6px] text-[11.5px] leading-none font-semibold whitespace-nowrap text-on-brand">
            {item.category.current}
          </span>
        )}
        {item.category.alternatives.map((alternative) => (
          <span
            key={alternative}
            className="inline-flex items-center gap-[6px] rounded-sm border border-border-strong px-[10px] py-[6px] text-[11.5px] leading-none font-medium whitespace-nowrap text-ink-2"
          >
            {alternative}
          </span>
        ))}
      </div>
      <p className="mt-[7px] text-[11px] leading-[1.5] text-pretty text-ink-3">
        {item.category.note}
      </p>
    </div>
  )
}

function RawSource({ item }: { item: ReviewItem }) {
  if (!item.rawSource.available) {
    return (
      <p
        data-slot="review-raw"
        className="mt-[7px] text-[11.5px] leading-[1.4] text-pretty text-ink-3"
      >
        {item.rawSource.reason}
      </p>
    )
  }
  return (
    <pre
      data-slot="review-raw"
      className="mt-[7px] max-h-[132px] overflow-auto font-mono text-[11.5px] leading-[1.4] whitespace-pre-wrap text-ink-3"
    >
      {item.rawSource.text}
    </pre>
  )
}

function ActionButton({
  action,
  variant,
  keyHint,
  onClick,
}: {
  action: ReviewAction
  variant: "primary" | "outline" | "ghost" | "danger"
  keyHint: string
  onClick: () => void
}) {
  const blocked = action.blockedReason !== null
  return (
    <Button
      variant={
        variant === "primary"
          ? "default"
          : variant === "outline"
            ? "outline"
            : "ghost"
      }
      disabled={blocked}
      {...(blocked ? { title: action.blockedReason ?? undefined } : {})}
      onClick={onClick}
      className={cn(
        "h-auto gap-2 rounded-button px-[14px] py-[9px] text-[12.5px] leading-none font-semibold",
        variant === "primary" && "px-[15px]",
        variant === "danger" && "text-negative hover:text-negative"
      )}
    >
      {action.label}
      <KeyBadge onFilled={variant === "primary"}>{keyHint}</KeyBadge>
    </Button>
  )
}

export interface ReviewCardProps {
  item: ReviewItem
  onConfirm: () => void
  onEdit: () => void
  onSkip: () => void
  onDiscard: () => void
  onCancelDiscard: () => void
  armedForDiscard: boolean
  isBusy: boolean
  bulkLabel: string | null
  onBulk: () => void
}

export function ReviewCard({
  item,
  onConfirm,
  onEdit,
  onSkip,
  onDiscard,
  onCancelDiscard,
  armedForDiscard,
  isBusy,
  bulkLabel,
  onBulk,
}: ReviewCardProps) {
  return (
    <article
      data-slot="review-card"
      data-source={item.source}
      aria-busy={isBusy}
      className="overflow-hidden rounded-panel border border-border-strong bg-surface"
      {...(item.mockId === null ? {} : mockAttributes(item.mockId))}
    >
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1 px-5 pt-5 pb-[18px] lg:px-[22px]">
          <div className="flex flex-wrap items-center gap-2">
            <SourceChip item={item} />
            <span className="font-mono text-[11px] leading-none font-medium text-ink-3">
              {item.arrivedLabel}
            </span>
            {item.mockId === null ? null : <MockBadge id={item.mockId} />}
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0 flex-1">
              <h3 className="text-[21px] leading-[1.2] font-semibold tracking-[-0.02em] text-pretty">
                {item.title}
              </h3>
              {item.detail === null ? null : (
                <p className="mt-[7px] font-mono text-[11.5px] leading-[1.4] text-ink-3">
                  {item.detail}
                </p>
              )}
              <RawSource item={item} />
            </div>
            <ReviewAmount figure={item.figure} size="lg" />
          </div>

          <FieldGrid item={item} />
          <CategoryRow item={item} />

          {item.note === null ? null : (
            <p
              data-slot="review-note"
              className="mt-[15px] flex items-start gap-2 rounded-button bg-brand-dim px-[13px] py-[11px] text-[11.5px] leading-[1.5] text-pretty text-ink-2"
            >
              <Sparkle
                aria-hidden
                className="mt-px size-[13px] flex-none stroke-brand"
              />
              {item.note}
            </p>
          )}
        </div>

        <aside
          data-slot="review-aside"
          className="flex-none border-t border-border bg-surface-2 px-[18px] pt-[18px] pb-4 lg:w-[296px] lg:border-t-0 lg:border-l"
        >
          <p className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
            {item.entriesTitle}
          </p>
          <ul className="mt-3">
            {item.entries.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center gap-[10px] border-b border-border py-[9px]"
              >
                <span className="min-w-0 flex-1">
                  <Truncate
                    text={entry.name}
                    className="block text-[12px] leading-[1.3] font-medium"
                  />
                  <Truncate
                    text={entry.meta}
                    className="block text-[10.5px] leading-[1.4] text-ink-3"
                  />
                </span>
                <ReviewAmount figure={entry.figure} className="text-ink-2" />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-[1.5] text-pretty text-ink-3">
            {item.entriesNote}
          </p>
        </aside>
      </div>

      <div
        data-slot="review-actions"
        className="flex flex-wrap items-center gap-[9px] border-t border-border bg-surface-2 px-5 py-[13px] lg:px-[22px]"
      >
        {armedForDiscard ? (
          <>
            <span className="text-[12px] leading-none text-ink-2">
              {item.source === "receipt"
                ? "Discard this receipt? Nothing is written and it leaves the queue."
                : "Delete permanently? This removes the transaction and its entries."}
            </span>
            <Button
              variant="outline"
              onClick={onDiscard}
              disabled={isBusy}
              className="h-auto rounded-button border-negative px-[14px] py-[9px] text-[12px] leading-none font-semibold text-negative"
            >
              {item.actions.discard.label}
            </Button>
            <Button
              variant="ghost"
              onClick={onCancelDiscard}
              className="h-auto rounded-button px-[14px] py-[9px] text-[12.5px] leading-none font-semibold text-ink-2"
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <ActionButton
              action={item.actions.confirm}
              variant="primary"
              keyHint="⏎"
              onClick={onConfirm}
            />
            <ActionButton
              action={item.actions.edit}
              variant="outline"
              keyHint="E"
              onClick={onEdit}
            />
            <ActionButton
              action={{ label: "Skip", blockedReason: null }}
              variant="ghost"
              keyHint="→"
              onClick={onSkip}
            />
            <span className="flex-1" />
            {bulkLabel === null ? null : (
              <>
                <Button
                  variant="ghost"
                  onClick={onBulk}
                  className={cn(
                    "h-auto rounded-sm px-0 text-[11.5px] leading-none font-medium text-ink-3 hover:bg-transparent",
                    HIT_TARGET_ROW
                  )}
                >
                  {bulkLabel}
                </Button>
                <span
                  aria-hidden
                  className="h-[18px] w-px flex-none bg-border-strong"
                />
              </>
            )}
            <ActionButton
              action={item.actions.discard}
              variant="danger"
              keyHint="⌫"
              onClick={onDiscard}
            />
          </>
        )}
      </div>
    </article>
  )
}
