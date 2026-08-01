import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Wallet } from "lucide-react"

import { useBaseCurrency, useUserId } from "@/auth"
import { Figure } from "@/components/figure"
import {
  CountChip,
  DisclosureCaret,
  EntityMark,
  focusRing,
  Panel,
  PanelFooter,
  PanelFootnote,
  PanelHeader,
  PanelNote,
  PanelTitle,
  ROW_ACTIVATION_CLASS,
  SyncDot,
  HIT_TARGET_ROW,
  Truncate,
} from "@/components/primitives"
import { EmptyState } from "@/components/states/empty-state"
import { LoadingState, SkeletonRows } from "@/components/states/loading-state"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type {
  AccountBalancesView,
  AccountClassBalanceGroup,
} from "@/features/accounts/api"
import { useAccountBalancesSuspense } from "@/features/accounts/api"
import { useRequiredBaseAssetId } from "@/features/portfolio/api"
import { cn } from "@/lib/utils"

import type { AccountSyncIndex } from "../api"
import { isSyncTrouble, useAccountSync } from "../api"

export const LIQUID_FOOTNOTE =
  "Liquid today sums current, savings and cash accounts. Liquidity is Sverto's own classification, not your provider's."

function ratelessNote(count: number): string {
  return `${count} ${count === 1 ? "holding has" : "holdings have"} no exchange rate, so these totals are short by that much.`
}

function deactivatedNote(count: number): string {
  return `${count} deactivated ${count === 1 ? "account" : "accounts"} still hold value. It counts towards net worth but is not listed here.`
}

function accountsFootnote(view: AccountBalancesView): string {
  return [
    LIQUID_FOOTNOTE,
    view.ratelessCount > 0 ? ratelessNote(view.ratelessCount) : "",
    view.unmatchedAccountIds.length > 0
      ? deactivatedNote(view.unmatchedAccountIds.length)
      : "",
  ]
    .filter(Boolean)
    .join(" ")
}

function AccountsGroup({
  group,
  currency,
  sync,
  defaultOpen,
}: {
  group: AccountClassBalanceGroup
  currency: string
  sync: AccountSyncIndex
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        data-slot="account-group-header"
        className={cn(
          "flex w-full items-center gap-[10px] border-b border-border bg-background px-[18px] py-[10px] text-start outline-none",
          focusRing.row
        )}
      >
        <DisclosureCaret expanded={open} className="w-3 flex-none" />
        <span className="flex-none text-[10px] leading-none font-semibold tracking-[0.09em] whitespace-nowrap uppercase">
          {group.label}
        </span>
        <Figure
          value={group.accounts.length}
          kind="plain"
          intent="meta"
          size="micro"
          className="flex-none text-[10px]"
        />
        <span aria-hidden className="flex-1" />
        <Figure
          value={group.subtotal}
          currency={currency}
          size="micro"
          className="text-[12px] font-semibold"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul>
          {group.accounts.map((account) => {
            const status = sync[account.accountId]
            return (
              <li key={account.accountId}>
                <Link
                  to="/accounts/$accountId"
                  params={{ accountId: account.accountId }}
                  data-slot="account-row"
                  className={cn(
                    "flex h-[44px] items-center gap-3 border-b border-border px-[18px]",
                    ROW_ACTIVATION_CLASS
                  )}
                >
                  <EntityMark
                    seed={account.accountId}
                    label={account.name}
                    size="sm"
                  />
                  <Truncate
                    text={account.name}
                    className="min-w-0 flex-1 text-[12.5px] leading-[1.3] font-medium"
                  />
                  {account.isJoint ? (
                    <CountChip className="flex-none">
                      <Figure
                        value={account.ownershipSharePercent}
                        kind="percent"
                        intent="secondary"
                        decimals={0}
                        size="micro"
                        className="text-[9.5px]"
                        aria-label={`your share of ${account.name}`}
                      />
                    </CountChip>
                  ) : null}
                  {isSyncTrouble(status) ? (
                    <SyncDot status={status} className="flex-none" />
                  ) : null}
                  <Figure
                    value={account.value}
                    currency={currency}
                    size="base"
                    className="flex-none text-[12.5px]"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AccountsPanelView({
  view,
  currency,
  sync,
}: {
  view: AccountBalancesView
  currency: string
  sync: AccountSyncIndex
}) {
  const groups = view.groups.filter((group) => group.accounts.length > 0)

  if (groups.length === 0) {
    return (
      <EmptyState
        data-slot="accounts-panel"
        icon={<Wallet />}
        headline="No accounts yet"
        body="An account is where a balance lives. Add one, or connect a bank and Sverto will create them for you."
        footnote={
          <Link to="/accounts" className="font-semibold text-brand">
            Add an account →
          </Link>
        }
      />
    )
  }

  return (
    <Panel data-slot="accounts-panel">
      <PanelHeader>
        <PanelTitle>Accounts</PanelTitle>
        <PanelNote>
          {view.accounts.length}{" "}
          {view.accounts.length === 1 ? "account" : "accounts"}
        </PanelNote>
      </PanelHeader>

      {groups.map((group) => (
        <AccountsGroup
          key={group.accountClass}
          group={group}
          currency={currency}
          sync={sync}
          defaultOpen={group.accountClass === "cash"}
        />
      ))}

      <PanelFooter>
        <Link
          to="/accounts"
          className={cn("outline-none", HIT_TARGET_ROW, focusRing.chip)}
        >
          Manage accounts →
        </Link>
        <span aria-hidden className="flex-1" />
        <span className="flex items-center gap-[6px] text-[11px] leading-none font-normal text-ink-3">
          <Figure
            value={view.liquidTotal}
            currency={currency}
            size="micro"
            intent="secondary"
          />
          liquid today
        </span>
      </PanelFooter>

      <PanelFootnote>{accountsFootnote(view)}</PanelFootnote>
    </Panel>
  )
}

export function AccountsPanelSkeleton() {
  return (
    <LoadingState label="Loading accounts">
      <SkeletonRows count={6} height={30} />
    </LoadingState>
  )
}

export function AccountsPanel() {
  const userId = useUserId()
  const currency = useBaseCurrency()
  const defaultAssetId = useRequiredBaseAssetId()
  const view = useAccountBalancesSuspense({ userId, defaultAssetId })
  const sync = useAccountSync(userId)

  return <AccountsPanelView view={view} currency={currency} sync={sync} />
}
