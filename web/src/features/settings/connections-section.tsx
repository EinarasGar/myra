import { useEffect, useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"

import { useUserId } from "@/auth"
import { countOf } from "@/lib/format"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { StatusChip } from "@/components/primitives"
import { EmptyState } from "@/components/states/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { ConnectionSummary, ProviderCatalogueEntry } from "./api"
import {
  PROVIDER_CATALOGUE,
  useCompleteOauthSession,
  useConnectionsSuspense,
  useCreateConnection,
  useStartOauthSession,
} from "./api"
import {
  SettingsBlock,
  SettingsBlocks,
  SettingsCard,
  SettingsCards,
  SettingsList,
  SettingsListRow,
} from "./blocks"
import {
  CONNECT_KEY_CONSEQUENCE,
  CONNECT_OAUTH_CONSEQUENCE,
  CONNECTIONS_READ_ONLY,
} from "./copy"
import { boundCountLabel, syncedLabel } from "./presentation"
import { EnableBankingDialog } from "./enable-banking-dialog"
import { SettingsCardsSkeleton, SettingsListSkeleton } from "./skeletons"

function connectionCountLabel(count: number): string {
  return countOf(count, "connection")
}

const PENDING_OAUTH_KEY = "sverto.pendingOauth"

interface PendingOauth {
  connectionId: string
  sessionId: string
  state: string
}

export function stashPendingOauth(pending: PendingOauth): void {
  localStorage.setItem(PENDING_OAUTH_KEY, JSON.stringify(pending))
}

function takePendingOauth(state: string): PendingOauth | null {
  const raw = localStorage.getItem(PENDING_OAUTH_KEY)
  if (raw === null) return null
  localStorage.removeItem(PENDING_OAUTH_KEY)
  try {
    const parsed = JSON.parse(raw) as PendingOauth
    return parsed.state === state ? parsed : null
  } catch {
    return null
  }
}

function OauthCompletion() {
  const userId = useUserId()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    oauthState?: string
    oauthCode?: string
    oauthError?: string
  }
  const complete = useCompleteOauthSession(userId)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (
      done ||
      complete.isPending ||
      search.oauthState === undefined ||
      search.oauthCode === undefined
    ) {
      return
    }
    const pending = takePendingOauth(search.oauthState)
    if (pending === null) return
    setDone(true)
    complete.mutate(
      {
        connectionId: pending.connectionId,
        sessionId: pending.sessionId,
        state: search.oauthState,
        code: search.oauthCode,
        error: search.oauthError,
      },
      {
        onSettled: () => {
          void navigate({ to: "/settings", search: { section: "connections" } })
        },
      }
    )
  }, [
    complete,
    done,
    navigate,
    search.oauthCode,
    search.oauthError,
    search.oauthState,
  ])

  return null
}

function ApiKeyDialog({
  provider,
  open,
  onOpenChange,
}: {
  provider: ProviderCatalogueEntry
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateConnection(useUserId())
  const [key, setKey] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {provider.name}</DialogTitle>
          <DialogDescription>{CONNECT_KEY_CONSEQUENCE}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="provider-api-key">API key</FieldLabel>
          <Input
            id="provider-api-key"
            type="password"
            autoComplete="off"
            value={key}
            onChange={(event) => {
              setKey(event.target.value)
            }}
          />
          <FieldDescription>
            Nothing is imported until you bind a provider account to one of
            yours on the next screen.
          </FieldDescription>
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
          <Button
            disabled={key.trim() === "" || create.isPending}
            onClick={() => {
              create.mutate(
                { providerKind: provider.kind, credential: key.trim() },
                {
                  onSuccess: () => {
                    setKey("")
                    onOpenChange(false)
                  },
                }
              )
            }}
          >
            {create.isPending ? "Connecting…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProviderCard({
  provider,
  count,
}: {
  provider: ProviderCatalogueEntry
  count: number
}) {
  const userId = useUserId()
  const create = useCreateConnection(userId)
  const startOauth = useStartOauthSession(userId)
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [bankingDialogOpen, setBankingDialogOpen] = useState(false)
  const pending = create.isPending || startOauth.isPending

  function connect() {
    if (provider.credential === "apiKey") {
      setKeyDialogOpen(true)
      return
    }
    if (provider.kind === "enablebanking") {
      setBankingDialogOpen(true)
      return
    }
    create.mutate(
      { providerKind: provider.kind },
      {
        onSuccess: (connectionId) => {
          startOauth.mutate(
            { connectionId },
            {
              onSuccess: ({ authUrl }) => {
                window.location.assign(authUrl)
              },
            }
          )
        },
      }
    )
  }

  return (
    <>
      <SettingsCard
        mark={provider.mark}
        name={provider.name}
        tagline={provider.tagline}
        description={`${provider.description} ${
          provider.credential === "oauth"
            ? CONNECT_OAUTH_CONSEQUENCE
            : CONNECT_KEY_CONSEQUENCE
        }`}
        action={
          <Button
            variant={provider.credential === "oauth" ? "default" : "outline"}
            disabled={pending}
            onClick={connect}
          >
            {pending ? "Starting…" : provider.connectLabel}
          </Button>
        }
        note={connectionCountLabel(count)}
      />
      {provider.credential === "apiKey" ? (
        <ApiKeyDialog
          provider={provider}
          open={keyDialogOpen}
          onOpenChange={setKeyDialogOpen}
        />
      ) : null}
      {provider.kind === "enablebanking" ? (
        <EnableBankingDialog
          provider={provider}
          open={bankingDialogOpen}
          onOpenChange={setBankingDialogOpen}
        />
      ) : null}
    </>
  )
}

function ConnectionRow({ connection }: { connection: ConnectionSummary }) {
  const parts = [
    connection.providerLabel,
    boundCountLabel(connection.boundCount, null),
    syncedLabel(connection.lastSyncAt),
  ]

  return (
    <SettingsListRow
      label={connection.providerLabel}
      chip={<StatusChip status={connection.statusWord} />}
      consequence={parts.join(" · ")}
      control={
        <Link
          to="/settings"
          search={{
            section: "connections",
            connection: connection.connectionId,
          }}
          className={buttonVariants({ variant: "outline" })}
        >
          Manage
        </Link>
      }
    />
  )
}

function ProvidersBlock() {
  const connections = useConnectionsSuspense(useUserId())
  return (
    <SettingsCards>
      {PROVIDER_CATALOGUE.map((provider) => (
        <ProviderCard
          key={provider.kind}
          provider={provider}
          count={connections.countByProvider[provider.kind] ?? 0}
        />
      ))}
    </SettingsCards>
  )
}

function ConnectionsBlock() {
  const connections = useConnectionsSuspense(useUserId())

  if (connections.count === 0) {
    return (
      <EmptyState
        headline="No connections yet"
        body="Connect a provider above and Sverto starts reading it. Until a provider account is bound to one of yours, nothing is imported."
        footnote={CONNECTIONS_READ_ONLY}
      />
    )
  }

  return (
    <SettingsList footnote={CONNECTIONS_READ_ONLY}>
      {connections.connections.map((connection) => (
        <ConnectionRow key={connection.connectionId} connection={connection} />
      ))}
    </SettingsList>
  )
}

export function ConnectionsSection() {
  return (
    <SettingsBlocks>
      <OauthCompletion />
      <SettingsBlock title="Providers">
        <PanelBoundary pending={<SettingsCardsSkeleton />}>
          <ProvidersBlock />
        </PanelBoundary>
      </SettingsBlock>

      <SettingsBlock title="Your connections">
        <PanelBoundary pending={<SettingsListSkeleton />}>
          <ConnectionsBlock />
        </PanelBoundary>
      </SettingsBlock>
    </SettingsBlocks>
  )
}
