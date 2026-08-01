import { useMemo } from "react"
import { PlusIcon } from "lucide-react"

import { useUserId } from "@/auth"
import { Figure } from "@/components/figure"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { Footnote, PageHeader } from "@/components/primitives"
import { DegradedState } from "@/components/states/message-state"
import { EmptyState } from "@/components/states/empty-state"
import { Button } from "@/components/ui/button"
import {
  useHoldingsSuspense,
  usePortfolioOverviewSuspense,
  useRequiredBaseAssetId,
} from "@/features/portfolio/api"

import { AccountEditor } from "./account-editor"
import { AccountGroup } from "./account-group"
import { AccountsSummary } from "./accounts-summary"
import {
  useAccountBalancesSuspense,
  useAccountConnectorsSuspense,
  useAccounts,
} from "./api"
import { NEW_ACCOUNT } from "./copy"
import { buildAccountIndex, unlistedAccounts } from "./rows"
import { AccountGroupsSkeleton, SummarySkeleton } from "./skeletons"
import { UnlistedAccounts } from "./unlisted-accounts"
import { useAccountEditor } from "./use-account-editor"

function AccountsMeta() {
  const accounts = useAccounts(useUserId())
  if (accounts.data === undefined) return null
  return (
    <>
      <Figure
        value={accounts.data.count}
        kind="plain"
        intent="meta"
        size="micro"
      />{" "}
      active
    </>
  )
}

function useAccountsIndex() {
  const userId = useUserId()
  const defaultAssetId = useRequiredBaseAssetId()
  const balances = useAccountBalancesSuspense({ userId, defaultAssetId })
  const holdings = useHoldingsSuspense({ userId, defaultAssetId })
  const overview = usePortfolioOverviewSuspense({ userId, defaultAssetId })
  const connectors = useAccountConnectorsSuspense(userId)

  const index = useMemo(
    () => buildAccountIndex(balances, overview, connectors),
    [balances, overview, connectors]
  )
  const unlisted = useMemo(
    () => unlistedAccounts(balances, holdings),
    [balances, holdings]
  )

  return { balances, index, unlisted, defaultAssetId }
}

function AccountsSummaryPanel() {
  const { balances, index, defaultAssetId } = useAccountsIndex()
  if (index.count === 0) return null
  return <AccountsSummary balances={balances} defaultAssetId={defaultAssetId} />
}

function AccountsGroups({ onAddAccount }: { onAddAccount: () => void }) {
  const { balances, index, unlisted } = useAccountsIndex()

  if (index.count === 0) {
    return (
      <EmptyState
        size="page"
        headline="No accounts yet"
        body="An account is where a balance lives — a current account, a broker, a mortgage. Add one and its transactions start rolling up into your net worth."
        actions={[
          {
            label: "Add your first account",
            kind: "primary",
            onClick: onAddAccount,
          },
        ]}
        footnote="Nothing here is hidden: this list shows every active account on your profile."
      />
    )
  }

  return (
    <div className="flex flex-col gap-[22px]">
      {balances.isDegraded ? (
        <DegradedState
          headline="Some balances are incomplete"
          body={`${balances.ratelessCount} holding${balances.ratelessCount === 1 ? " has" : "s have"} no rate path to your base currency, so every total on this page is short by that much.`}
          detail="Add a rate for the missing pair, or price the asset manually, and the totals close."
        />
      ) : null}

      {index.groups.map((group) => (
        <AccountGroup key={group.accountClass} group={group} />
      ))}

      <UnlistedAccounts accounts={unlisted} total={balances.unmatchedValue} />

      <Footnote className="mt-1">
        Balances convert to your base currency at today&rsquo;s rates. Joint
        accounts are shown at your ownership share. Groups are Sverto&rsquo;s
        reading of each account type, not something you set on an account.
      </Footnote>
    </div>
  )
}

export function AccountsIndex() {
  const userId = useUserId()
  const editor = useAccountEditor()

  return (
    <>
      <PageHeader
        eyebrow="Where your money is"
        title="Accounts"
        meta={<AccountsMeta />}
        actions={
          <Button size="lg" onClick={editor.openCreate}>
            <PlusIcon aria-hidden data-icon="inline-start" />
            {NEW_ACCOUNT}
          </Button>
        }
      />
      <div className="flex flex-col gap-[26px]">
        <PanelBoundary pending={<SummarySkeleton />}>
          <AccountsSummaryPanel />
        </PanelBoundary>
        <PanelBoundary pending={<AccountGroupsSkeleton />}>
          <AccountsGroups onAddAccount={editor.openCreate} />
        </PanelBoundary>
      </div>
      <AccountEditor
        userId={userId}
        mode={editor.mode}
        open={editor.open}
        onOpenChange={editor.setOpen}
      />
    </>
  )
}
