import type * as React from "react"

import { cn } from "@/lib/utils"

export function LandingSection({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "px-5 pt-14 md:px-8 md:pt-[72px] lg:px-10 lg:pt-[88px] xl:px-16 xl:pt-[110px]",
        className
      )}
      {...props}
    >
      <div className="mx-auto w-full max-w-[1180px]">{children}</div>
    </section>
  )
}

export function SectionEyebrow({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "font-mono text-[9.5px] leading-none font-semibold tracking-[0.16em] text-brand uppercase xl:text-[10.5px] xl:tracking-[0.18em]",
        className
      )}
      {...props}
    />
  )
}

export function SectionHeading({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "mt-3.5 text-[26px] leading-[1.18] font-bold tracking-[-0.028em] text-pretty md:text-[32px] lg:mt-5 lg:text-[36px] xl:text-[42px] xl:leading-[1.14] xl:tracking-[-0.032em]",
        className
      )}
      {...props}
    />
  )
}

export function SectionLede({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mt-3.5 text-[14px] leading-[1.65] text-pretty text-ink-2 md:text-[15px] lg:mt-5 lg:text-[16px] xl:text-[17px] xl:leading-[1.6]",
        className
      )}
      {...props}
    />
  )
}

export function SectionAside({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mt-3 text-[13px] leading-[1.6] text-pretty text-ink-3 md:text-[14px] xl:text-[15px] xl:leading-[1.65]",
        className
      )}
      {...props}
    />
  )
}

export function SectionSplit({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-5 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10",
        className
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-[15px] leading-[1.35] font-semibold tracking-[-0.012em] text-pretty",
        className
      )}
      {...props}
    />
  )
}

export function CardBody({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mt-2 text-[13px] leading-[1.6] text-pretty text-ink-2 xl:text-[13.5px] xl:leading-[1.65]",
        className
      )}
      {...props}
    />
  )
}

export function MetaLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[9.5px] leading-none font-semibold tracking-[0.12em] text-ink-3 uppercase",
        className
      )}
      {...props}
    />
  )
}
