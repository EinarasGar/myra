import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"

import { useAuth, useAuthMe, useBaseCurrency, useUserId } from "@/auth"
import { env } from "@/lib/env"
import type { AssetRef } from "@/lib/domain/refs"
import { assetLabel, CURRENCY_ASSET_TYPE_ID } from "@/lib/domain/refs"
import { Figure } from "@/components/figure"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { SegmentedControl } from "@/components/primitives"
import { WaitingState } from "@/components/states/message-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTheme } from "@/components/theme-provider"
import { assetQueryOptions } from "@/features/assets/api"
import { useBaseAssetId } from "@/features/portfolio/api"

import type { CurrencyOption } from "./api"
import { useCurrencyOptions, useSetBaseCurrency } from "./api"
import {
  SettingsBlock,
  SettingsBlocks,
  SettingsConsequence,
  SettingsDanger,
  SettingsList,
  SettingsListRow,
  SettingsPicker,
  SettingsPickerOption,
} from "./blocks"
import {
  ACCOUNT_DANGER_BODY,
  ACCOUNT_DANGER_TITLE,
  BASE_CURRENCY_CONSEQUENCE,
  BASE_CURRENCY_NO_RATE,
  BASE_CURRENCY_RATE_SCOPE,
  NOAUTH_CONSEQUENCE,
  SIGN_OUT_CONSEQUENCE,
  THEME_CONSEQUENCE,
} from "./copy"
import { PickerRowsSkeleton } from "./skeletons"

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const

function RateDetail({
  baseCurrency,
  option,
}: {
  baseCurrency: string
  option: CurrencyOption
}) {
  if (option.isCurrent) return null
  if (option.quote === null) {
    return (
      <Figure
        value={null}
        kind="rate"
        intent="meta"
        size="micro"
        emptyLabel={
          option.status === "loading" ? "Loading rate" : BASE_CURRENCY_NO_RATE
        }
      />
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono text-[11.5px] leading-none text-ink-3">
        1 {baseCurrency} =
      </span>
      <Figure
        value={option.quote.rate}
        kind="rate"
        intent="meta"
        size="micro"
      />
    </span>
  )
}

function BaseCurrencyPicker({ baseAssetId }: { baseAssetId: number }) {
  const userId = useUserId()
  const baseCurrency = useBaseCurrency()
  const [query, setQuery] = useState("")
  const setBaseCurrency = useSetBaseCurrency(userId)
  const detail = useQuery(assetQueryOptions(baseAssetId))
  const current = useMemo<AssetRef>(
    () => ({
      assetId: baseAssetId,
      ticker: detail.data?.ticker ?? baseCurrency,
      name: detail.data?.name ?? null,
      assetTypeId: CURRENCY_ASSET_TYPE_ID,
    }),
    [baseAssetId, baseCurrency, detail.data]
  )
  const currencies = useCurrencyOptions(current, query)

  const footnote =
    currencies.totalResults === undefined ? (
      BASE_CURRENCY_CONSEQUENCE
    ) : (
      <>
        {BASE_CURRENCY_CONSEQUENCE} Showing {currencies.shown} of{" "}
        {currencies.totalResults} currencies. {BASE_CURRENCY_RATE_SCOPE}
      </>
    )

  return (
    <SettingsPicker
      footnote={footnote}
      search={
        <>
          <Search aria-hidden className="size-[13px] flex-none text-ink-3" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            aria-label="Search currencies"
            placeholder="Search currencies…"
            className="h-auto border-0 bg-transparent px-0 py-0 text-[12.5px] shadow-none focus-visible:ring-0"
          />
        </>
      }
    >
      {currencies.isPending ? (
        <PickerRowsSkeleton />
      ) : currencies.options.length === 0 ? (
        <p className="px-4 py-[18px] text-[12px] leading-[1.6] text-ink-3">
          No currency matches “{query}”.
        </p>
      ) : (
        currencies.options.map((option) => (
          <SettingsPickerOption
            key={option.asset.assetId}
            ticker={option.asset.ticker ?? "—"}
            name={option.asset.name ?? assetLabel(option.asset)}
            aria-label={`${option.asset.ticker ?? ""} ${option.asset.name ?? assetLabel(option.asset)}${option.isCurrent ? " — your base currency" : ""}`}
            selected={option.isCurrent}
            disabled={option.isCurrent || setBaseCurrency.isPending}
            detail={<RateDetail baseCurrency={baseCurrency} option={option} />}
            onClick={() => {
              setBaseCurrency.mutate({ assetId: option.asset.assetId })
            }}
          />
        ))
      )}
    </SettingsPicker>
  )
}

function BaseCurrencyGate() {
  const baseAssetId = useBaseAssetId()
  if (baseAssetId === null) {
    return (
      <WaitingState
        headline="No base currency is set on this profile"
        body="Every converted total needs one. Finish onboarding to pick a base currency, and this picker fills in with the currencies Sverto knows."
      />
    )
  }
  return <BaseCurrencyPicker baseAssetId={baseAssetId} />
}

function AppearanceBlock() {
  const { theme, setTheme } = useTheme()
  return (
    <SettingsList>
      <SettingsListRow
        label="Theme"
        consequence={THEME_CONSEQUENCE}
        control={
          <SegmentedControl
            label="Theme"
            value={theme}
            onValueChange={setTheme}
            options={THEME_OPTIONS}
          />
        }
      />
    </SettingsList>
  )
}

function AccountBlock() {
  const { isAuthenticated, signOut } = useAuth()
  const me = useAuthMe(isAuthenticated)
  const navigate = useNavigate()
  const canSignOut = env.authProvider !== "noauth"

  return (
    <SettingsList>
      <SettingsListRow
        label="Signed in as"
        consequence={`Role ${me.data?.role ?? "unknown"}. Sverto stores a username and a role, and nothing else about you.`}
        control={
          <span className="font-mono text-[12.5px] leading-none text-ink-2">
            {me.data?.user_metadata?.username ?? "—"}
          </span>
        }
      />
      <SettingsListRow
        label="Sign out"
        consequence={canSignOut ? SIGN_OUT_CONSEQUENCE : NOAUTH_CONSEQUENCE}
        control={
          <Button
            variant="outline"
            disabled={!canSignOut}
            onClick={() => {
              void signOut().then(() => navigate({ to: "/login" }))
            }}
          >
            Sign out
          </Button>
        }
      />
    </SettingsList>
  )
}

export function GeneralSection() {
  return (
    <SettingsBlocks>
      <SettingsBlock title="Base currency" note="every total is shown in this">
        <PanelBoundary pending={<PickerRowsSkeleton panel />}>
          <BaseCurrencyGate />
        </PanelBoundary>
      </SettingsBlock>

      <SettingsBlock title="Appearance">
        <AppearanceBlock />
      </SettingsBlock>

      <SettingsBlock title="Account">
        <AccountBlock />
      </SettingsBlock>

      <SettingsBlock title="Danger zone">
        <SettingsDanger
          title={ACCOUNT_DANGER_TITLE}
          lost={ACCOUNT_DANGER_BODY}
        />
        <SettingsConsequence>
          Revoking a provider&rsquo;s access is available today — it lives on
          each connection under Connections.
        </SettingsConsequence>
      </SettingsBlock>
    </SettingsBlocks>
  )
}
