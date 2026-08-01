/* eslint-disable react-refresh/only-export-components */
import { createContext, use, type ReactNode } from "react"

const FigureBaseCurrencyContext = createContext<string | null>(null)

export function FigureBaseCurrencyProvider({
  currency,
  children,
}: {
  currency: string | null
  children: ReactNode
}) {
  return (
    <FigureBaseCurrencyContext value={currency}>
      {children}
    </FigureBaseCurrencyContext>
  )
}

export function useFigureBaseCurrency(): string | null {
  return use(FigureBaseCurrencyContext)
}
