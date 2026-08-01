import type * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "@/lib/utils"

import { focusRing } from "./focus-ring"

export function PageHeader({
  eyebrow,
  back,
  title,
  meta,
  intro,
  actions,
  className,
  ...props
}: Omit<React.ComponentProps<"header">, "title"> & {
  eyebrow?: React.ReactNode
  back?: React.ReactNode
  title: React.ReactNode
  meta?: React.ReactNode
  intro?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-2 pb-[18px]",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {(back ?? eyebrow) ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {back ? (
              <>
                {back}
                <span className="text-[11px] leading-none text-ink-3">/</span>
              </>
            ) : null}
            {eyebrow ? (
              <span className="text-[10px] leading-none font-semibold tracking-[0.14em] text-ink-3 uppercase">
                {eyebrow}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-[11px] flex flex-wrap items-baseline gap-x-[11px] gap-y-[6px]">
          <h1 className="min-w-0 text-[27px] leading-none font-bold tracking-[-0.025em] wrap-break-word">
            {title}
          </h1>
          {meta ? (
            <span className="font-mono text-[12px] leading-none font-medium whitespace-nowrap text-ink-3">
              {meta}
            </span>
          ) : null}
        </div>
        {intro ? (
          <p className="mt-[9px] max-w-[620px] text-[12.5px] leading-[1.6] text-pretty text-ink-3">
            {intro}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex max-w-full min-w-0 flex-none flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  )
}

export function PageHeaderBackLink({
  className,
  children,
  render,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "text-[11px] leading-none font-medium whitespace-nowrap text-brand outline-none",
          focusRing.chip,
          className
        ),
        children: (
          <>
            {"← "}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: { slot: "page-header-back" },
  })
}

export function SectionHeader({
  label,
  note,
  action,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode
  note?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "mb-3 flex flex-wrap items-center gap-x-3 gap-y-2",
        className
      )}
      {...props}
    >
      <span className="min-w-0 text-[10px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase">
        {label}
      </span>
      <span aria-hidden className="h-px min-w-4 flex-1 bg-border" />
      {note ? (
        <span className="min-w-0 text-[11px] leading-none font-medium text-ink-3">
          {note}
        </span>
      ) : null}
      {action ? (
        <span className="flex max-w-full min-w-0 items-center">{action}</span>
      ) : null}
    </div>
  )
}
