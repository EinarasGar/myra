import type * as React from "react"

import { cn } from "@/lib/utils"
import {
  Panel,
  PanelFootnote,
  SectionHeader,
  Truncate,
} from "@/components/primitives"

export function SettingsBlocks({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="settings-blocks"
      className={cn("flex min-w-0 flex-col gap-[26px]", className)}
      {...props}
    />
  )
}

export function SettingsBlock({
  title,
  note,
  action,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode
  note?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section data-slot="settings-block" className={className} {...props}>
      <SectionHeader label={title} note={note} action={action} />
      {children}
    </section>
  )
}

export function SettingsConsequence({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="settings-consequence"
      className={cn(
        "mt-[5px] text-[11.5px] leading-[1.5] text-pretty text-ink-3",
        className
      )}
      {...props}
    />
  )
}

export function SettingsList({
  footnote,
  children,
  className,
  ...props
}: React.ComponentProps<"section"> & { footnote?: React.ReactNode }) {
  return (
    <Panel data-slot="settings-list" className={className} {...props}>
      <div className="[&>*:last-child]:border-b-0">{children}</div>
      {footnote ? <PanelFootnote>{footnote}</PanelFootnote> : null}
    </Panel>
  )
}

export function SettingsListRow({
  label,
  chip,
  consequence,
  control,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode
  chip?: React.ReactNode
  consequence?: React.ReactNode
  control?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="settings-list-row"
      className={cn(
        "flex flex-wrap items-start gap-x-[14px] gap-y-[10px] border-b border-border px-4 py-[14px]",
        className
      )}
      {...props}
    >
      <div className="min-w-[min(100%,220px)] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] leading-[1.3] font-medium">{label}</span>
          {chip}
        </div>
        {consequence ? (
          <SettingsConsequence>{consequence}</SettingsConsequence>
        ) : null}
        {children}
      </div>
      {control ? (
        <div className="flex flex-none items-center gap-[10px]">{control}</div>
      ) : null}
    </div>
  )
}

export function SettingsCards({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="settings-cards"
      className={cn("grid gap-[14px] md:grid-cols-2", className)}
      {...props}
    />
  )
}

export function SettingsCard({
  mark,
  name,
  tagline,
  description,
  action,
  note,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "children"> & {
  mark: React.ReactNode
  name: React.ReactNode
  tagline: React.ReactNode
  description: React.ReactNode
  action?: React.ReactNode
  note?: React.ReactNode
}) {
  return (
    <Panel
      data-slot="settings-card"
      className={cn(
        "flex flex-col gap-[10px] px-[18px] pt-[17px] pb-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-[11px]">
        <span
          aria-hidden
          className="flex size-8 flex-none items-center justify-center rounded-md border border-border bg-surface-2 font-mono text-[12px] leading-none font-semibold text-ink-2"
        >
          {mark}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] leading-[1.2] font-semibold">
            {name}
          </span>
          <span className="mt-1 block text-[11.5px] leading-[1.4] text-ink-3">
            {tagline}
          </span>
        </span>
      </div>
      <p className="text-[11.5px] leading-[1.6] text-pretty text-ink-2">
        {description}
      </p>
      {(action ?? note) ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-[10px]">
          {action}
          {note ? (
            <span className="text-[11px] leading-none text-ink-3">{note}</span>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}

export function SettingsBindings({
  footnote,
  children,
  className,
  ...props
}: React.ComponentProps<"section"> & { footnote?: React.ReactNode }) {
  return (
    <Panel data-slot="settings-bindings" className={className} {...props}>
      <div className="[&>*:last-child]:border-b-0">{children}</div>
      {footnote ? <PanelFootnote>{footnote}</PanelFootnote> : null}
    </Panel>
  )
}

export function SettingsBindingRow({
  provider,
  providerMeta,
  target,
  status,
  meta,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  provider: React.ReactNode
  providerMeta?: React.ReactNode
  target: React.ReactNode
  status?: React.ReactNode
  meta?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="settings-binding"
      className={cn("border-b border-border", className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px] px-4 pt-[14px] pb-[13px]">
        <div className="flex min-w-[min(100%,240px)] flex-1 flex-wrap items-center gap-3">
          <span className="min-w-0">
            <Truncate className="block text-[12.5px] leading-[1.3] font-medium">
              {provider}
            </Truncate>
            {providerMeta ? (
              <span className="block font-mono text-[10.5px] leading-[1.4] text-ink-3">
                {providerMeta}
              </span>
            ) : null}
          </span>
          <span aria-hidden className="flex-none text-[12px] text-ink-3">
            →
          </span>
          {target}
        </div>
        {status}
        {meta ? (
          <span className="flex-none text-[11px] leading-none whitespace-nowrap text-ink-3">
            {meta}
          </span>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-[10px] border-t border-border bg-surface-2 px-4 pt-[11px] pb-[13px]">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function SettingsBindingTarget({
  className,
  title,
  meta,
  ...props
}: Omit<React.ComponentProps<"span">, "title"> & {
  title: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <span
      data-slot="binding-target"
      className={cn("min-w-0", className)}
      {...props}
    >
      <Truncate className="block text-[12.5px] leading-[1.3] font-medium">
        {title}
      </Truncate>
      {meta ? (
        <span className="block text-[10.5px] leading-[1.4] text-ink-3">
          {meta}
        </span>
      ) : null}
    </span>
  )
}

export function SettingsQuota({
  footnote,
  children,
  className,
  ...props
}: React.ComponentProps<"section"> & { footnote?: React.ReactNode }) {
  return (
    <Panel data-slot="settings-quota" className={className} {...props}>
      <div className="[&>*:last-child]:border-b-0">{children}</div>
      {footnote ? <PanelFootnote>{footnote}</PanelFootnote> : null}
    </Panel>
  )
}

export function SettingsQuotaWindow({
  title,
  reset,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode
  reset?: React.ReactNode
}) {
  return (
    <div
      data-slot="quota-window"
      className={cn(
        "border-b border-border px-[18px] pt-4 pb-[17px]",
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-1">
        <span className="text-[13px] leading-none font-semibold">{title}</span>
        {reset ? (
          <span className="text-[11px] leading-none text-ink-3">{reset}</span>
        ) : null}
      </div>
      <div className="mt-[14px] flex flex-col gap-[13px]">{children}</div>
    </div>
  )
}

export type QuotaTone = "brand" | "attention" | "negative"

const QUOTA_FILLS: Record<QuotaTone, string> = {
  brand: "bg-brand",
  attention: "bg-attention",
  negative: "bg-negative",
}

export function SettingsQuotaBar({
  label,
  value,
  ratio,
  tone = "brand",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode
  value: React.ReactNode
  ratio: number | null
  tone?: QuotaTone
}) {
  const width = ratio === null ? 0 : Math.min(Math.max(ratio, 0), 1) * 100

  return (
    <div data-slot="quota-bar" className={className} {...props}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11.5px] leading-none font-medium text-ink-2">
          {label}
        </span>
        <span className="text-[11.5px] leading-none font-medium text-ink-3">
          {value}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(ratio === null ? {} : { "aria-valuenow": Math.round(width) })}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className={cn("h-full rounded-full", QUOTA_FILLS[tone])}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export function SettingsPicker({
  search,
  footnote,
  children,
  className,
  ...props
}: React.ComponentProps<"section"> & {
  search?: React.ReactNode
  footnote?: React.ReactNode
}) {
  return (
    <Panel data-slot="settings-picker" className={className} {...props}>
      {search ? (
        <div className="flex items-center gap-[9px] border-b border-border bg-surface-2 px-4 py-[9px]">
          {search}
        </div>
      ) : null}
      <div className="[&>*:last-child]:border-b-0">{children}</div>
      {footnote ? <PanelFootnote>{footnote}</PanelFootnote> : null}
    </Panel>
  )
}

export function SettingsPickerOption({
  ticker,
  name,
  selected = false,
  detail,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "children"> & {
  ticker: React.ReactNode
  name: React.ReactNode
  selected?: boolean
  detail?: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-slot="picker-option"
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-[13px] border-b border-border px-4 py-3 text-left transition-colors duration-instant ease-out-quick outline-none",
        "hover:bg-surface-2 focus-visible:bg-surface-2",
        selected &&
          "bg-brand-dim hover:bg-brand-dim focus-visible:bg-brand-dim",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "w-[34px] flex-none font-mono text-[12.5px] leading-none font-semibold",
          selected ? "text-brand" : "text-ink-2"
        )}
      >
        {ticker}
      </span>
      <Truncate
        text={name}
        className="min-w-0 flex-1 text-[12.5px] leading-none font-medium"
      />
      {selected ? (
        <span className="flex-none text-[10px] leading-none font-semibold tracking-[0.06em] text-brand uppercase">
          Current
        </span>
      ) : null}
      {detail ? (
        <span className="flex-none font-mono text-[11.5px] leading-none whitespace-nowrap text-ink-3">
          {detail}
        </span>
      ) : null}
    </button>
  )
}

export function SettingsDanger({
  title,
  lost,
  survives,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode
  lost: React.ReactNode
  survives?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section
      data-slot="settings-danger"
      className={cn(
        "flex flex-wrap items-start gap-4 rounded-panel border border-negative-dim bg-surface px-[18px] pt-4 pb-[17px]",
        className
      )}
      {...props}
    >
      <div className="min-w-[min(100%,240px)] flex-1">
        <h3 className="text-[13px] leading-[1.3] font-semibold text-negative">
          {title}
        </h3>
        <p className="mt-[7px] text-[11.5px] leading-[1.6] text-pretty text-ink-2">
          {lost}
        </p>
        {survives ? (
          <p className="mt-[7px] text-[11.5px] leading-[1.6] text-pretty text-ink-3">
            {survives}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </section>
  )
}
