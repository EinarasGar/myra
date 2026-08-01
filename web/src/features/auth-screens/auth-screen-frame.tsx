import type { ReactNode } from "react"

export function AuthScreenFrame({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow: ReactNode
  title?: ReactNode
  intro?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div data-slot="auth-screen" className="flex flex-col">
      <span className="text-[10px] leading-none font-semibold tracking-[0.14em] text-ink-3 uppercase">
        {eyebrow}
      </span>
      {title ? (
        <h1 className="mt-3 text-[24px] leading-[1.25] font-bold tracking-[-0.024em] text-pretty">
          {title}
        </h1>
      ) : null}
      {intro ? (
        <p className="mt-[11px] text-[13px] leading-[1.65] text-pretty text-ink-3">
          {intro}
        </p>
      ) : null}
      <div className="mt-[26px]">{children}</div>
      {footer ? (
        <div className="mt-[18px] text-[12px] leading-[1.6] text-pretty text-ink-3">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
