import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { useUserId } from "@/auth"
import { formatDateStamp } from "@/lib/format"
import type { ConnectionId } from "@/lib/query"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { EntityPicker, StatusChip } from "@/components/primitives"
import { ErrorState } from "@/components/states/message-state"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { AccountConnector } from "@/features/accounts/api"
import { useAccountsSuspense } from "@/features/accounts/api"

import type { ConnectionSummary, ProviderAccountRef } from "./api"
import {
  useConnectionsSuspense,
  useCreateBinding,
  useDeleteBinding,
  useProviderAccountsSuspense,
  useRevokeConnection,
  useSyncBinding,
  useUpdateBinding,
} from "./api"
import {
  SettingsBindingRow,
  SettingsBindings,
  SettingsBindingTarget,
  SettingsBlock,
  SettingsBlocks,
  SettingsConsequence,
  SettingsDanger,
  SettingsList,
  SettingsListRow,
} from "./blocks"
import { ConfirmDestructive } from "./confirm-dialog"
import {
  BINDING_UNBOUND_CONSEQUENCE,
  CONNECTION_IMPORT_TOTAL_UNAVAILABLE,
  CONSENT_CONSEQUENCE,
  PAUSE_CONSEQUENCE,
  REMOVE_BINDING_BODY,
  REMOVE_BINDING_TITLE,
  RESUME_CONSEQUENCE,
  REVOKE_CONNECTION_BODY,
  REVOKE_CONNECTION_TITLE,
  TRUSTED_WRITES_OFF,
  TRUSTED_WRITES_ON,
} from "./copy"
import { consentLabel, syncedLabel } from "./presentation"
import { SettingsListSkeleton } from "./skeletons"

function providerMetaOf(account: ProviderAccountRef): string {
  const parts = [account.accountType, account.currency].filter(
    (part): part is string => part !== null && part !== ""
  )
  return parts.length === 0
    ? account.providerAccountId
    : `${parts.join(" · ")} · ${account.providerAccountId}`
}

function BindingActions({
  binding,
  onRemove,
}: {
  binding: AccountConnector
  onRemove: () => void
}) {
  const userId = useUserId()
  const update = useUpdateBinding(userId)
  const sync = useSyncBinding(userId)
  const paused = binding.status === "paused"

  return (
    <>
      <Switch
        checked={binding.writesPostDirectly}
        disabled={update.isPending}
        aria-label="Trusted writes"
        onCheckedChange={(checked) => {
          update.mutate({
            bindingId: binding.bindingId,
            paused,
            writesPostDirectly: checked,
          })
        }}
      />
      <div className="min-w-[min(100%,220px)] flex-1">
        <p className="text-[11.5px] leading-[1.3] font-semibold">
          Trusted writes
        </p>
        <p className="text-[11px] leading-[1.5] text-pretty text-ink-3">
          {binding.writesPostDirectly ? TRUSTED_WRITES_ON : TRUSTED_WRITES_OFF}
        </p>
        <p className="text-[11px] leading-[1.5] text-pretty text-ink-3">
          {paused ? RESUME_CONSEQUENCE : PAUSE_CONSEQUENCE}
        </p>
      </div>
      <Button
        variant="ghost"
        size="xs"
        disabled={sync.isPending}
        onClick={() => {
          sync.mutate({ bindingId: binding.bindingId })
        }}
      >
        {sync.isPending ? "Syncing…" : "Sync now"}
      </Button>
      <Button
        variant="ghost"
        size="xs"
        disabled={update.isPending}
        onClick={() => {
          update.mutate({
            bindingId: binding.bindingId,
            paused: !paused,
            writesPostDirectly: binding.writesPostDirectly,
          })
        }}
      >
        {paused ? "Resume" : "Pause"}
      </Button>
      <Button
        variant="ghost"
        size="xs"
        className="text-negative hover:text-negative"
        onClick={onRemove}
      >
        Remove
      </Button>
    </>
  )
}

function BindPicker({
  connectionId,
  providerAccountId,
}: {
  connectionId: ConnectionId
  providerAccountId: string
}) {
  const userId = useUserId()
  const accounts = useAccountsSuspense(userId)
  const bind = useCreateBinding(userId)
  const [accountId, setAccountId] = useState("")

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <EntityPicker
        size="sm"
        label="Pick an account"
        placeholder="Pick an account…"
        className="w-[190px]"
        value={accountId === "" ? null : accountId}
        options={accounts.accounts.map((account) => ({
          value: account.accountId,
          label: account.name,
          ...(account.accountTypeName === null
            ? {}
            : { subLabel: account.accountTypeName }),
        }))}
        onValueChange={(next) => {
          setAccountId(next ?? "")
        }}
      />
      <Button
        variant="outline"
        size="xs"
        disabled={accountId === "" || bind.isPending}
        onClick={() => {
          bind.mutate({ connectionId, providerAccountId, accountId })
        }}
      >
        {bind.isPending ? "Binding…" : "Bind"}
      </Button>
    </span>
  )
}

function BindingsBlock({ connection }: { connection: ConnectionSummary }) {
  const userId = useUserId()
  const providerAccounts = useProviderAccountsSuspense(
    userId,
    connection.connectionId
  )
  const accounts = useAccountsSuspense(userId)
  const remove = useDeleteBinding(userId)
  const [pending, setPending] = useState<AccountConnector | null>(null)

  const bindingByProviderAccount = new Map(
    connection.bindings.map((binding) => [binding.providerAccountId, binding])
  )

  return (
    <>
      <SettingsBindings footnote={BINDING_UNBOUND_CONSEQUENCE}>
        {providerAccounts.map((providerAccount) => {
          const binding = bindingByProviderAccount.get(
            providerAccount.providerAccountId
          )
          const bound =
            binding === undefined ? undefined : accounts.byId[binding.accountId]

          return (
            <SettingsBindingRow
              key={providerAccount.providerAccountId}
              provider={providerAccount.displayName}
              providerMeta={providerMetaOf(providerAccount)}
              status={
                <StatusChip
                  size="binding"
                  status={binding?.statusWord ?? "notLinked"}
                />
              }
              meta={
                binding === undefined
                  ? "never synced"
                  : syncedLabel(binding.lastSyncAt)
              }
              target={
                binding === undefined ? (
                  <BindPicker
                    connectionId={connection.connectionId}
                    providerAccountId={providerAccount.providerAccountId}
                  />
                ) : (
                  <SettingsBindingTarget
                    title={bound?.name ?? "Account not in your list"}
                    meta={
                      bound === undefined
                        ? "This binding points at an account you can no longer see."
                        : `${bound.accountTypeName ?? "—"} · ${bound.ownershipSharePercent}% yours`
                    }
                  />
                )
              }
            >
              {binding === undefined ? null : (
                <BindingActions
                  binding={binding}
                  onRemove={() => {
                    setPending(binding)
                  }}
                />
              )}
            </SettingsBindingRow>
          )
        })}
        {connection.bindings
          .filter(
            (binding) =>
              !providerAccounts.some(
                (account) =>
                  account.providerAccountId === binding.providerAccountId
              )
          )
          .map((binding) => (
            <SettingsBindingRow
              key={binding.bindingId}
              provider="Provider account no longer listed"
              providerMeta={binding.providerAccountId}
              status={<StatusChip size="binding" status={binding.statusWord} />}
              meta={syncedLabel(binding.lastSyncAt)}
              target={
                <SettingsBindingTarget
                  title={
                    accounts.byId[binding.accountId]?.name ??
                    "Account not in your list"
                  }
                  meta="The provider stopped returning this account, so nothing new can arrive for it."
                />
              }
            >
              <BindingActions
                binding={binding}
                onRemove={() => {
                  setPending(binding)
                }}
              />
            </SettingsBindingRow>
          ))}
      </SettingsBindings>
      <ConfirmDestructive
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={REMOVE_BINDING_TITLE}
        lost={REMOVE_BINDING_BODY}
        confirmLabel="Unbind"
        pending={remove.isPending}
        onConfirm={() => {
          const target = pending
          if (target === null) return
          remove.mutate(
            { bindingId: target.bindingId },
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

function StatusBlock({ connection }: { connection: ConnectionSummary }) {
  return (
    <SettingsList>
      <SettingsListRow
        label="Connection"
        chip={<StatusChip status={connection.statusWord} />}
        consequence={`${syncedLabel(connection.lastSyncAt)}. ${CONNECTION_IMPORT_TOTAL_UNAVAILABLE}`}
        control={
          <span className="text-[11px] leading-none text-ink-3">
            connected{" "}
            {formatDateStamp(connection.createdAt, { year: "always" })}
          </span>
        }
      />
      <SettingsListRow
        label="Consent"
        consequence={CONSENT_CONSEQUENCE}
        control={
          <span className="font-mono text-[12px] leading-none text-ink-2">
            {consentLabel(connection.consentExpiresAt)}
          </span>
        }
      />
    </SettingsList>
  )
}

function DangerBlock({ connection }: { connection: ConnectionSummary }) {
  const userId = useUserId()
  const revoke = useRevokeConnection(userId)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <>
      <SettingsDanger
        title={REVOKE_CONNECTION_TITLE}
        lost={REVOKE_CONNECTION_BODY}
        action={
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              setOpen(true)
            }}
          >
            Revoke access
          </Button>
        }
      />
      <ConfirmDestructive
        open={open}
        onOpenChange={setOpen}
        title={`Revoke ${connection.providerLabel}?`}
        lost={REVOKE_CONNECTION_BODY}
        confirmLabel="Revoke access"
        pending={revoke.isPending}
        onConfirm={() => {
          revoke.mutate(
            { connectionId: connection.connectionId },
            {
              onSuccess: () => {
                setOpen(false)
                void navigate({
                  to: "/settings",
                  search: { section: "connections" },
                })
              },
            }
          )
        }}
      />
    </>
  )
}

function ConnectionBody({ connectionId }: { connectionId: ConnectionId }) {
  const connections = useConnectionsSuspense(useUserId())
  const connection = connections.byId[connectionId]

  if (connection === undefined) {
    return (
      <ErrorState
        headline="That connection is not on your account"
        body="It may have been revoked from this page or from the provider. The connections list above is the live one."
      />
    )
  }

  return (
    <SettingsBlocks>
      <SettingsBlock title="Status">
        <StatusBlock connection={connection} />
      </SettingsBlock>

      <SettingsBlock
        title="Account bindings"
        note={`${connection.boundCount} bound`}
      >
        <PanelBoundary pending={<SettingsListSkeleton />}>
          <BindingsBlock connection={connection} />
        </PanelBoundary>
        <SettingsConsequence>
          A provider account only imports once it is bound. Binding is
          reversible and never rewrites what has already arrived.
        </SettingsConsequence>
      </SettingsBlock>

      <SettingsBlock title="Danger zone">
        <DangerBlock connection={connection} />
      </SettingsBlock>
    </SettingsBlocks>
  )
}

export function ConnectionDetail({
  connectionId,
}: {
  connectionId: ConnectionId
}) {
  return (
    <PanelBoundary pending={<SettingsListSkeleton rows={4} />}>
      <ConnectionBody connectionId={connectionId} />
    </PanelBoundary>
  )
}
