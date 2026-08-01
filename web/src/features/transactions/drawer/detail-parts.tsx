import type { ReactNode } from "react"

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
      {children}
    </p>
  )
}

export function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-[14px]">
      <span className="flex-none text-[12px] leading-[1.4] text-ink-3">
        {label}
      </span>
      <span className="min-w-0 text-right text-[12px] leading-[1.4] font-medium">
        {children}
      </span>
    </div>
  )
}
