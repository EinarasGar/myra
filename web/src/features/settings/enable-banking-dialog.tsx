import { useMemo, useState } from "react"

import { useUserId } from "@/auth"
import { EntityPicker } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"

import type { ProviderCatalogueEntry } from "./api"
import { stashPendingOauth } from "./connections-section"
import {
  useAspsps,
  useCreateConnection,
  useStartOauthSession,
} from "./api"

const ENABLE_BANKING_COUNTRIES = [
  "FI",
  "SE",
  "DK",
  "NO",
  "GB",
  "DE",
  "FR",
  "NL",
  "EE",
  "LV",
  "LT",
] as const

function countryOptions() {
  return ENABLE_BANKING_COUNTRIES.map((code) => ({
    value: code,
    label: code,
  }))
}

export function EnableBankingDialog({
  provider,
  open,
  onOpenChange,
}: {
  provider: ProviderCatalogueEntry
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const userId = useUserId()
  const create = useCreateConnection(userId)
  const startOauth = useStartOauthSession(userId)
  const [country, setCountry] = useState<string | null>(null)
  const [bankName, setBankName] = useState<string | null>(null)

  const aspsps = useAspsps(userId, provider.kind, country)

  const bankOptions = useMemo(
    () =>
      (aspsps.data ?? []).map((aspsp) => ({
        value: aspsp.name,
        label: aspsp.name,
      })),
    [aspsps.data]
  )

  function pickCountry(next: string | null) {
    setCountry(next)
    setBankName(null)
  }

  function connect() {
    if (bankName === null) return
    create.mutate(
      { providerKind: provider.kind },
      {
        onSuccess: (connectionId) => {
          startOauth.mutate(
            { connectionId, bankName, bankCountry: country ?? undefined },
            {
              onSuccess: ({ authUrl, sessionId, state }) => {
                stashPendingOauth({
                  connectionId,
                  sessionId,
                  state,
                })
                window.location.assign(authUrl)
              },
            }
          )
        },
      }
    )
  }

  const pending = create.isPending || startOauth.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {provider.name}</DialogTitle>
          <DialogDescription>
            Choose your country and bank, then you will be taken to your bank's
            consent screen.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="enable-banking-country">Country</FieldLabel>
          <EntityPicker
            id="enable-banking-country"
            value={country}
            placeholder="Select a country"
            options={countryOptions()}
            onValueChange={pickCountry}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="enable-banking-bank">Bank</FieldLabel>
          <EntityPicker
            id="enable-banking-bank"
            value={bankName}
            placeholder={
              country === null ? "Pick a country first" : "Select a bank"
            }
            disabled={country === null || aspsps.isPending}
            options={bankOptions}
            emptyLabel="No banks found for this country"
            onValueChange={setBankName}
          />
        </Field>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button disabled={bankName === null || pending} onClick={connect}>
            {pending ? "Connecting…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
