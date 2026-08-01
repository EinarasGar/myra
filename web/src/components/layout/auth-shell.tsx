import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { SvertoMark } from "./sverto-mark"

export function AuthShell({
  pitchTitle,
  pitchBody,
  pitchPoints = [],
  aside,
  brandFoot,
  children,
}: {
  pitchTitle?: ReactNode
  pitchBody?: ReactNode
  pitchPoints?: readonly string[]
  aside?: ReactNode
  brandFoot?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh items-stretch bg-background">
      <div
        className={cn(
          "hidden w-[452px] flex-none flex-col border-r border-border bg-surface px-11 pt-11 pb-10 lg:flex"
        )}
      >
        <div className="flex items-center gap-[11px]">
          <SvertoMark className="size-[26px]" />
          <span className="text-[18px] leading-none font-bold tracking-[-0.02em]">
            Sverto
          </span>
        </div>

        {pitchTitle ? (
          <div className="mt-[46px]">
            <h2 className="text-[27px] leading-[1.25] font-semibold tracking-[-0.028em] text-pretty">
              {pitchTitle}
            </h2>
            {pitchBody ? (
              <p className="mt-4 text-[13.5px] leading-[1.7] text-pretty text-ink-2">
                {pitchBody}
              </p>
            ) : null}
            {pitchPoints.length > 0 ? (
              <ul className="mt-[26px] flex flex-col gap-[13px]">
                {pitchPoints.map((point) => (
                  <li key={point} className="flex items-start gap-[11px]">
                    <span
                      aria-hidden
                      className="mt-[7px] size-[5px] flex-none rounded-[2px] bg-brand"
                    />
                    <span className="text-[12.5px] leading-[1.6] text-pretty text-ink-2">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {aside ? <div className="mt-13">{aside}</div> : null}

        {brandFoot ? (
          <>
            <div className="flex-1" />
            <p className="text-[11px] leading-[1.6] text-pretty text-ink-3">
              {brandFoot}
            </p>
          </>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-4 py-10 md:px-10 lg:px-14">
        <div className="flex items-center gap-[11px] lg:hidden">
          <SvertoMark className="size-[22px]" />
          <span className="text-[15px] leading-none font-bold tracking-[-0.02em]">
            Sverto
          </span>
        </div>
        <div className="mx-auto mt-10 w-full max-w-[520px] lg:mx-0 lg:mt-0 lg:flex lg:min-h-full lg:flex-col lg:justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}
