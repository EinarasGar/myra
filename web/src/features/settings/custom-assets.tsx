import { useState } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { useBaseCurrency, useUserId } from "@/auth"
import { assetLabel, isCurrencyAssetType } from "@/lib/domain/refs"
import { Figure } from "@/components/figure"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { MetaChip } from "@/components/primitives"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { EntityPicker } from "@/components/primitives"
import type { CustomAssetValuation } from "@/features/assets/api"
import {
  assetTypesQueryOptions,
  customAssetFormSchema,
  useCreateCustomAsset,
  useCustomAssetValuations,
  useDeleteCustomAsset,
} from "@/features/assets/api"
import { useBaseAssetId } from "@/features/portfolio/api"
import {
  daysSinceValuation,
  isStaleValuation,
  lastValuedLine,
  valuationAgeLabel,
} from "@/features/assets"

import { SettingsBlock, SettingsList, SettingsListRow } from "./blocks"
import { ConfirmDestructive } from "./confirm-dialog"
import { CUSTOM_ASSET_CONSEQUENCE, CUSTOM_ASSET_UNPRICED } from "./copy"
import { SettingsListSkeleton } from "./skeletons"

function valuationNote(
  valuation: CustomAssetValuation,
  baseCurrency: string,
  now: Date
): string {
  if (valuation.status === "loading") return "Fetching the latest rate…"
  if (valuation.quote === null) return CUSTOM_ASSET_UNPRICED
  const line = lastValuedLine(valuation.quote.asOf, now)
  const days = daysSinceValuation(valuation.quote.asOf, now)
  return isStaleValuation(days)
    ? `One unit in ${baseCurrency}. ${line} — every total still uses it.`
    : `One unit in ${baseCurrency}. ${line}.`
}

function NewCustomAssetDialog({
  onOpenChange,
  baseAssetId,
  baseCurrency,
}: {
  onOpenChange: (open: boolean) => void
  baseAssetId: number
  baseCurrency: string
}) {
  const userId = useUserId()
  const create = useCreateCustomAsset(userId)
  const assetTypes = useSuspenseQuery(assetTypesQueryOptions()).data
  const options = assetTypes.filter((type) => !isCurrencyAssetType(type.id))
  const [ticker, setTicker] = useState("")
  const [name, setName] = useState("")
  const [assetType, setAssetType] = useState(String(options[0]?.id ?? ""))
  const [issues, setIssues] = useState<Partial<Record<string, string>>>({})

  function submit() {
    const parsed = customAssetFormSchema.safeParse({
      ticker,
      name,
      asset_type: Number(assetType),
      base_asset_id: baseAssetId,
    })
    if (!parsed.success) {
      const next: Partial<Record<string, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "")
        if (key !== "" && next[key] === undefined) next[key] = issue.message
      }
      setIssues(next)
      return
    }
    setIssues({})
    create.mutate(
      { body: parsed.data },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New custom asset</DialogTitle>
          <DialogDescription>
            A custom asset is anything Sverto cannot price for you — a flat, a
            watch, unlisted equity. You enter its rate yourself.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field data-invalid={issues.ticker !== undefined}>
            <FieldLabel htmlFor="custom-asset-ticker">Ticker</FieldLabel>
            <Input
              id="custom-asset-ticker"
              value={ticker}
              onChange={(event) => {
                setTicker(event.target.value)
              }}
            />
            <FieldDescription>
              A short handle you will recognise in pickers and lot tables.
            </FieldDescription>
            {issues.ticker ? <FieldError>{issues.ticker}</FieldError> : null}
          </Field>
          <Field data-invalid={issues.name !== undefined}>
            <FieldLabel htmlFor="custom-asset-name">Name</FieldLabel>
            <Input
              id="custom-asset-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
            {issues.name ? <FieldError>{issues.name}</FieldError> : null}
          </Field>
          <Field data-invalid={issues.asset_type !== undefined}>
            <FieldLabel htmlFor="custom-asset-type">Asset type</FieldLabel>
            <EntityPicker
              id="custom-asset-type"
              value={assetType}
              placeholder="Select an asset type"
              invalid={issues.asset_type !== undefined}
              options={options.map((type) => ({
                value: String(type.id),
                label: type.name,
              }))}
              onValueChange={(next) => {
                setAssetType(next ?? "")
              }}
            />
            {issues.asset_type ? (
              <FieldError>{issues.asset_type}</FieldError>
            ) : null}
          </Field>
          <p className="text-[11.5px] leading-[1.5] text-pretty text-ink-3">
            It will be priced against {baseCurrency}, your base currency. Until
            you enter a rate it counts as nothing in every total.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button disabled={create.isPending} onClick={submit}>
            {create.isPending ? "Creating…" : "Create asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CustomAssetsList({ baseAssetId }: { baseAssetId: number }) {
  const userId = useUserId()
  const baseCurrency = useBaseCurrency()
  const valuations = useCustomAssetValuations(userId, baseAssetId)
  const remove = useDeleteCustomAsset(userId)
  const [pending, setPending] = useState<CustomAssetValuation | null>(null)
  const now = new Date()

  if (valuations.length === 0) {
    return (
      <SettingsList footnote={CUSTOM_ASSET_CONSEQUENCE}>
        <SettingsListRow
          label="No custom assets yet"
          consequence="Add one for anything Sverto cannot price on its own — property, collectibles, unlisted equity. Everything else is priced from market data."
        />
      </SettingsList>
    )
  }

  return (
    <>
      <SettingsList footnote={CUSTOM_ASSET_CONSEQUENCE}>
        {valuations.map((valuation) => (
          <SettingsListRow
            key={valuation.asset.assetId}
            label={assetLabel(valuation.asset)}
            chip={
              valuation.quote !== null &&
              isStaleValuation(
                daysSinceValuation(valuation.quote.asOf, now)
              ) ? (
                <MetaChip tone="attention">
                  {valuationAgeLabel(
                    daysSinceValuation(valuation.quote.asOf, now)
                  )}
                </MetaChip>
              ) : null
            }
            consequence={valuationNote(valuation, baseCurrency, now)}
            control={
              <>
                <Figure
                  value={valuation.quote?.rate ?? null}
                  currency={baseCurrency}
                  emptyLabel={CUSTOM_ASSET_UNPRICED}
                />
                <Link
                  to="/portfolio/$assetId"
                  params={{ assetId: String(valuation.asset.assetId) }}
                  className={buttonVariants({ variant: "outline", size: "xs" })}
                >
                  Value it
                </Link>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-negative hover:text-negative"
                  onClick={() => {
                    setPending(valuation)
                  }}
                >
                  Delete
                </Button>
              </>
            }
          />
        ))}
      </SettingsList>
      <ConfirmDestructive
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={`Delete ${pending === null ? "this asset" : assetLabel(pending.asset)}?`}
        lost="The asset and every rate you entered for it are removed, so any holding of it stops being valued."
        survives="Transactions that reference it are not deleted. Sverto refuses the delete outright while the asset is still held, so nothing can silently disappear from your ledger."
        confirmLabel="Delete asset"
        pending={remove.isPending}
        onConfirm={() => {
          const target = pending
          if (target === null) return
          remove.mutate(
            { assetId: target.asset.assetId },
            {
              onSettled: () => {
                setPending(null)
              },
            }
          )
        }}
      />
    </>
  )
}

export function CustomAssetsBlock() {
  const baseAssetId = useBaseAssetId()
  const baseCurrency = useBaseCurrency()
  const [creating, setCreating] = useState(false)

  return (
    <SettingsBlock
      title="Custom assets"
      note="priced by you, not by market data"
      action={
        baseAssetId === null ? null : (
          <Button
            variant="ghost"
            size="xs"
            className="text-brand hover:text-brand"
            onClick={() => {
              setCreating(true)
            }}
          >
            <Plus aria-hidden className="size-3" />
            New asset
          </Button>
        )
      }
    >
      {baseAssetId === null ? (
        <SettingsList>
          <SettingsListRow
            label="Custom assets need a base currency"
            consequence="Every custom asset is priced against your base currency, so pick one first under General."
          />
        </SettingsList>
      ) : (
        <>
          <PanelBoundary pending={<SettingsListSkeleton />}>
            <CustomAssetsList baseAssetId={baseAssetId} />
          </PanelBoundary>
          {creating ? (
            <PanelBoundary pending={null}>
              <NewCustomAssetDialog
                onOpenChange={setCreating}
                baseAssetId={baseAssetId}
                baseCurrency={baseCurrency}
              />
            </PanelBoundary>
          ) : null}
        </>
      )}
    </SettingsBlock>
  )
}
