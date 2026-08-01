import type { ComponentProps } from "react"

import {
  ARROW_DOWN,
  ARROW_UP,
  EM_DASH,
  figureDirection,
  formatFigure,
  rendersSignGlyph,
  toFigureNumber,
  type FigureFormatOptions,
  type FigureKind,
  type FigureValue,
  type PercentScale,
  type SignDisplay,
} from "@/lib/format"
import { cn } from "@/lib/utils"

import { useFigureBaseCurrency } from "./base-currency"
import {
  DEFAULT_SIGN_BY_INTENT,
  figureVariants,
  isColouredTone,
  resolveFigureTone,
  type FigureIntent,
  type FigureSize,
} from "./figure-variants"

export interface FigureProps extends Omit<
  ComponentProps<"span">,
  "children" | "color"
> {
  value: FigureValue
  kind?: FigureKind
  intent?: FigureIntent
  size?: FigureSize
  sign?: SignDisplay
  currency?: string
  ticker?: string | null
  scale?: PercentScale
  decimals?: number
  locale?: string
  compact?: boolean
  arrow?: boolean
  emptyLabel?: string
}

type FigureViewProps = Omit<FigureProps, "currency" | "kind"> & {
  currency: string
  kind: FigureKind
}

interface FigureFormatInput {
  currency: string
  ticker: string | null | undefined
  scale: PercentScale | undefined
  decimals: number | undefined
  locale: string | undefined
  compact: boolean | undefined
}

function figureFormat(
  kind: FigureKind,
  input: FigureFormatInput
): FigureFormatOptions {
  const { locale, decimals, compact } = input
  switch (kind) {
    case "units":
      return { kind, ticker: input.ticker, locale, decimals, compact }
    case "percent":
      return { kind, scale: input.scale, locale, decimals }
    case "rate":
      return { kind, locale, decimals }
    case "plain":
      return { kind, locale, decimals, compact }
    case "money":
      return { kind, currency: input.currency, locale, decimals, compact }
  }
}

export function Figure({ kind = "money", currency, ...props }: FigureProps) {
  const needsBaseCurrency =
    kind === "money" &&
    currency === undefined &&
    toFigureNumber(props.value) !== null
  if (needsBaseCurrency) {
    return <BaseCurrencyFigure kind={kind} {...props} />
  }
  return <FigureView kind={kind} currency={currency ?? ""} {...props} />
}

function BaseCurrencyFigure(props: Omit<FigureViewProps, "currency">) {
  const baseCurrency = useFigureBaseCurrency()
  return <FigureView currency={baseCurrency ?? ""} {...props} />
}

function FigureView({
  value,
  kind,
  intent = "neutral",
  size = "base",
  sign,
  currency,
  ticker,
  scale,
  decimals,
  locale,
  compact,
  arrow = false,
  emptyLabel = "Not applicable",
  className,
  ...props
}: FigureViewProps) {
  if (toFigureNumber(value) === null) {
    return (
      <span
        data-figure=""
        data-tone="meta"
        aria-label={emptyLabel}
        className={cn(figureVariants({ size, tone: "meta" }), className)}
        {...props}
      >
        {EM_DASH}
      </span>
    )
  }

  const format = figureFormat(kind, {
    currency,
    ticker,
    scale,
    decimals,
    locale,
    compact,
  })
  const direction = figureDirection(value, format)
  const tone = resolveFigureTone(intent, direction)
  const requestedSign = sign ?? DEFAULT_SIGN_BY_INTENT[intent]
  const arrowGlyph = direction > 0 ? ARROW_UP : direction < 0 ? ARROW_DOWN : ""
  const showsArrow = arrow && arrowGlyph !== ""
  const resolvedSign: SignDisplay =
    isColouredTone(tone) &&
    !showsArrow &&
    !rendersSignGlyph(direction, requestedSign)
      ? "always"
      : requestedSign

  return (
    <span
      data-figure=""
      data-tone={tone}
      className={cn(figureVariants({ size, tone }), className)}
      {...props}
    >
      {showsArrow ? (
        <span aria-hidden="true" className="mr-1">
          {arrowGlyph}
        </span>
      ) : null}
      {formatFigure(value, { ...format, sign: resolvedSign })}
    </span>
  )
}
