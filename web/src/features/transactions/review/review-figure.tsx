import { Figure, type FigureSize } from "@/components/figure"
import { mockMarkerProps } from "@/lib/mock"

import { nativeFigureProps } from "../api"
import type { ReviewFigure } from "./api"

export function ReviewAmount({
  figure,
  size,
  className,
}: {
  figure: ReviewFigure
  size?: FigureSize
  className?: string
}) {
  if (figure.kind === "native") {
    return (
      <Figure
        {...nativeFigureProps(figure.amount)}
        intent={figure.intent}
        {...(size ? { size } : {})}
        {...(className ? { className } : {})}
      />
    )
  }

  if (figure.kind === "mock") {
    return (
      <Figure
        value={figure.value}
        kind={figure.figureKind}
        ticker={figure.ticker}
        {...(size ? { size } : {})}
        {...(className ? { className } : {})}
        {...mockMarkerProps(figure.mockId)}
      />
    )
  }

  return (
    <Figure
      value={null}
      emptyLabel={figure.reason}
      {...(size ? { size } : {})}
      {...(className ? { className } : {})}
    />
  )
}
