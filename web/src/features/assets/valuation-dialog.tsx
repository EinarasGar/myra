import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { useUserId } from "@/auth"
import { formatDateStamp, formatMoney } from "@/lib/format"
import { Button } from "@/components/ui/button"
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
import { parseEditorDate } from "@/features/transactions/editor/date-input"

import {
  fromUnixSeconds,
  manualRateFormSchema,
  useAddManualRates,
  useDeleteManualRates,
  userAssetPairQueryOptions,
} from "./api"
import { valuationAddedToast, valuationRestoredToast } from "./toasts"
import { impliedChangeLine } from "./valuation"

export const VALUATION_DATE_HINT =
  "Plain English works — today, yesterday, 30 days ago, 2026-02-14."
export const VALUATION_DATE_UNREADABLE =
  "That date could not be read. Try 2026-02-14 or “30 days ago”."
export const VALUATION_RATE_UNREADABLE = "Enter a rate above zero."
export const VALUATION_CONFLICT =
  "A valuation already exists on that date. Remove it below, or pick another date."

type FieldIssues = Partial<Record<string, string>>

export function AddValuationDialog({
  assetId,
  referenceId,
  ticker,
  referenceTicker,
  onOpenChange,
}: {
  assetId: number
  referenceId: number
  ticker: string
  referenceTicker: string
  onOpenChange: (open: boolean) => void
}) {
  const userId = useUserId()
  const add = useAddManualRates(userId)
  const remove = useDeleteManualRates(userId)
  const pair = useQuery(userAssetPairQueryOptions(userId, assetId, referenceId))
  const latestRate = pair.data?.quote?.rate ?? null
  const [dateText, setDateText] = useState("today")
  const [rateText, setRateText] = useState("")
  const [issues, setIssues] = useState<FieldIssues>({})

  const parsedDate = useMemo(
    () => parseEditorDate(dateText, new Date()),
    [dateText]
  )
  const rate = Number(rateText.trim())
  const rateIsNumber = rateText.trim() !== "" && Number.isFinite(rate)
  const implied = rateIsNumber ? impliedChangeLine(rate, latestRate) : null

  function submit() {
    if (parsedDate.date === null) {
      setIssues({ date: VALUATION_DATE_UNREADABLE })
      return
    }
    if (!rateIsNumber) {
      setIssues({ rate: VALUATION_RATE_UNREADABLE })
      return
    }
    const parsed = manualRateFormSchema.safeParse({
      date: parsedDate.date,
      rate,
    })
    if (!parsed.success) {
      const next: FieldIssues = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "")
        if (key !== "" && next[key] === undefined) next[key] = issue.message
      }
      setIssues(next)
      return
    }
    setIssues({})
    const value = parsed.data
    const stamp = formatDateStamp(fromUnixSeconds(value.date), {
      year: "always",
    })
    add.mutate(
      { assetId, referenceId, rates: [value] },
      {
        onSuccess: () => {
          onOpenChange(false)
          valuationAddedToast({
            amount: formatMoney(value.rate, { currency: referenceTicker }),
            stamp,
            onUndo: () => {
              remove.mutate(
                {
                  assetId,
                  referenceId,
                  startTimestamp: value.date,
                  endTimestamp: value.date,
                },
                {
                  onSuccess: () => {
                    valuationRestoredToast(stamp)
                  },
                }
              )
            },
          })
        },
      }
    )
  }

  const conflict = add.error?.kind === "conflict" ? VALUATION_CONFLICT : null

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a valuation</DialogTitle>
          <DialogDescription>
            Sverto cannot price {ticker}, so this figure is the only thing
            holding it up. Everything that values it uses the most recent
            valuation on or before the date in question.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field data-invalid={issues.date !== undefined}>
            <FieldLabel htmlFor="valuation-date">Valued on</FieldLabel>
            <Input
              id="valuation-date"
              value={dateText}
              autoComplete="off"
              onChange={(event) => {
                setDateText(event.target.value)
              }}
            />
            <FieldDescription>
              {parsedDate.label ?? VALUATION_DATE_HINT}
            </FieldDescription>
            {issues.date ? <FieldError>{issues.date}</FieldError> : null}
          </Field>

          <Field data-invalid={issues.rate !== undefined}>
            <FieldLabel htmlFor="valuation-rate">
              What one {ticker} is worth in {referenceTicker}
            </FieldLabel>
            <Input
              id="valuation-rate"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder="0.00"
              value={rateText}
              onChange={(event) => {
                setRateText(event.target.value)
              }}
            />
            <FieldDescription>
              {latestRate === null
                ? "This is the first valuation for the pair."
                : `Your last valuation was ${formatMoney(latestRate, { currency: referenceTicker })}.`}
            </FieldDescription>
            {issues.rate ? <FieldError>{issues.rate}</FieldError> : null}
          </Field>

          {implied === null ? null : (
            <p
              data-slot="implied-change"
              className="rounded-md border border-dashed border-border-strong px-[13px] py-[10px] text-[11px] leading-[1.5] text-pretty text-ink-3"
            >
              {implied}
            </p>
          )}

          {conflict === null ? null : (
            <p className="text-[11.5px] leading-[1.5] text-pretty text-negative">
              {conflict}
            </p>
          )}
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
          <Button disabled={add.isPending} onClick={submit}>
            {add.isPending ? "Saving…" : "Save valuation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
