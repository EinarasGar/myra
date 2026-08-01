import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { useUserId } from "@/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { userAssetPairQueryOptions, useUpdateAssetExchange } from "./api"

export const SOURCE_LABEL = "Source"
export const SOURCE_ARIA_LABEL = "Where your valuations come from"
export const SOURCE_PLACEHOLDER = "Not recorded"

/**
 * The pair's `exchange` field: for a market asset it names the venue, and for one you
 * price yourself it is the only record of where the number came from.
 */
export function ExchangeField({
  assetId,
  referenceId,
}: {
  assetId: number
  referenceId: number
}) {
  const userId = useUserId()
  const pair = useQuery(userAssetPairQueryOptions(userId, assetId, referenceId))
  const update = useUpdateAssetExchange(userId)
  const [draft, setDraft] = useState<string | null>(null)

  const saved = pair.data?.exchange ?? ""
  const value = draft ?? saved
  const dirty = draft !== null && draft.trim() !== saved.trim()

  return (
    <div className="min-w-[min(100%,170px)] flex-1">
      <div className="mb-2 text-[9.5px] leading-none font-semibold tracking-[0.11em] text-ink-3 uppercase">
        {SOURCE_LABEL}
      </div>
      <div className="flex items-center gap-[6px]">
        <Input
          aria-label={SOURCE_ARIA_LABEL}
          className="h-9 py-[9px] text-[12px]"
          placeholder={SOURCE_PLACEHOLDER}
          value={value}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
        />
        {dirty ? (
          <Button
            variant="outline"
            size="xs"
            disabled={update.isPending}
            onClick={() => {
              update.mutate(
                { assetId, referenceId, body: { exchange: value.trim() } },
                {
                  onSuccess: () => {
                    setDraft(null)
                  },
                }
              )
            }}
          >
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
