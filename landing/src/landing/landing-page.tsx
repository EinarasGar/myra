import type { ReactNode } from "react"

import { LandingFooter } from "./landing-footer"
import { LandingHeader } from "./landing-header"
import { ClientsSection } from "./sections/clients-section"
import { CloseSection } from "./sections/close-section"
import { CurrencySection } from "./sections/currency-section"
import { DerivationSection } from "./sections/derivation-section"
import { FounderSection } from "./sections/founder-section"
import { HeroSection } from "./sections/hero-section"
import { InvestingSection } from "./sections/investing-section"
import { MyraSection } from "./sections/myra-section"
import { PricingSection } from "./sections/pricing-section"
import { ProblemSection } from "./sections/problem-section"
import { TrustSection } from "./sections/trust-section"

export function LandingPage({ commitFeed }: { commitFeed?: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background text-ink">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <DerivationSection />
        <CurrencySection />
        <InvestingSection />
        <MyraSection />
        <TrustSection />
        <ClientsSection />
        <PricingSection />
        <FounderSection commitFeed={commitFeed} />
        <CloseSection />
      </main>
      <LandingFooter />
    </div>
  )
}
