import {
  LandingSection,
  SectionEyebrow,
  SectionHeading,
  SectionSplit,
} from "../section"

function ThemedShot({
  dark,
  light,
  alt,
  className,
  width,
  height,
}: {
  dark: string
  light: string
  alt: string
  className?: string
  width: number
  height: number
}) {
  return (
    <>
      <img
        src={dark}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={`hidden dark:block ${className ?? ""}`}
      />
      <img
        src={light}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={`dark:hidden ${className ?? ""}`}
      />
    </>
  )
}

export function ClientsSection() {
  return (
    <LandingSection id="apps" className="scroll-mt-[68px]">
      <SectionEyebrow>07 · The clients</SectionEyebrow>
      <SectionSplit>
        <SectionHeading className="mt-0 max-w-[720px]">
          A desk app and a pocket app. One ledger underneath.
        </SectionHeading>
        <p className="max-w-[420px] text-[13.5px] leading-[1.6] text-pretty text-ink-2 lg:text-[15px] lg:leading-[1.65]">
          The web app for the monthly review, the native Android app for the
          receipt you&rsquo;re holding right now. Same backend, same numbers, no
          export step. iOS is planned.
        </p>
      </SectionSplit>

      <div className="relative mt-8 lg:mt-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-10%] top-[-8%] bottom-[-14%] -z-10 rounded-[50%] bg-brand-dim opacity-70 blur-[90px]"
        />

        <div className="relative md:pr-[150px] lg:pr-[168px] xl:pr-[196px]">
          <div className="-mr-5 overflow-hidden rounded-l-2xl border border-r-0 border-border-strong bg-surface shadow-popover sm:mr-0 sm:rounded-2xl sm:border-r md:-mr-[8%] lg:-mr-[10%] xl:-mr-[14%]">
            <div className="hidden h-[34px] items-center gap-2 border-b border-border bg-surface-2 px-3.5 md:flex">
              <span className="size-2 rounded-full bg-border-strong" />
              <span className="size-2 rounded-full bg-border-strong" />
              <span className="size-2 rounded-full bg-border-strong" />
              <div className="flex flex-1 justify-center">
                <span className="rounded-sm bg-background px-3 py-[3px] font-mono text-[10.5px] leading-none text-ink-3">
                  app.sverto.com
                </span>
              </div>
            </div>
            <ThemedShot
              dark="/shots/ledger-dark.png"
              light="/shots/ledger-light.png"
              alt="The Sverto web app dashboard: net worth in euros, a thirty-day chart, accounts grouped by cash and investments, and the most recent transactions."
              width={1600}
              height={826}
              className="block w-[560px] max-w-none sm:w-full"
            />
          </div>

          <div className="relative z-10 mx-auto mt-7 w-[186px] overflow-hidden rounded-[26px] border-[6px] border-border-strong bg-surface shadow-popover sm:w-[200px] md:absolute md:right-0 md:bottom-[-6%] md:mt-0 md:w-[210px] lg:w-[236px] lg:border-[7px] xl:w-[264px]">
            <ThemedShot
              dark="/shots/phone-dark.png"
              light="/shots/phone-light.png"
              alt="The Sverto Android app showing net worth, a portfolio chart and a holdings list including property, currency and fund positions."
              width={640}
              height={1436}
              className="block w-full"
            />
          </div>
        </div>
      </div>
    </LandingSection>
  )
}
