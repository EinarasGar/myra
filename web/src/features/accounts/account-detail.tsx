import { Link, useNavigate } from "@tanstack/react-router"
import { PencilIcon } from "lucide-react"

import { useUserId } from "@/auth"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import {
  Footnote,
  PageHeader,
  PageHeaderBackLink,
} from "@/components/primitives"
import { DegradedState } from "@/components/states/message-state"
import { Button } from "@/components/ui/button"
import {
  useAccountPortfolioOverviewSuspense,
  useHoldingsSuspense,
  useRequiredBaseAssetId,
} from "@/features/portfolio/api"

import { AccountConnection } from "./account-connection"
import { AccountEditor } from "./account-editor"
import { AccountFacts } from "./account-facts"
import { AccountHero } from "./account-hero"
import { AccountHoldings } from "./account-holdings"
import { AccountRecentTransactions } from "./account-recent"
import { AccountTiles } from "./account-tiles"
import type { AccountDetail as AccountDetailView } from "./api"
import { useAccountConnectorsSuspense, useAccountSuspense } from "./api"
import { EDIT_ACCOUNT } from "./copy"
import { accountHeaderMeta } from "./presentation"
import { AccountPanelSkeleton } from "./skeletons"
import { useAccountEditor } from "./use-account-editor"

function AccountBody({
  account,
  accountId,
}: {
  account: AccountDetailView
  accountId: string
}) {
  const userId = useUserId()
  const defaultAssetId = useRequiredBaseAssetId()
  const overview = useAccountPortfolioOverviewSuspense({
    userId,
    accountId,
    defaultAssetId,
  })
  const holdings = useHoldingsSuspense({ userId, defaultAssetId })
  const entry = holdings.byAccountId[accountId]

  return (
    <div className="flex flex-col gap-[26px]">
      {account.isJoint ? (
        <DegradedState
          headline={`This page shows the whole account, not your ${String(Math.round(account.ownershipSharePercent))}% share`}
          body="Cost basis, profit and fees below are for the whole account — your ownership share is not applied to them. The balance and every figure on the accounts index do apply it."
        />
      ) : null}

      <AccountTiles
        account={account}
        overview={overview}
        balance={entry?.value ?? null}
      />

      <AccountHoldings overview={overview} />

      <div className="grid gap-[26px] xl:grid-cols-[7fr_5fr] xl:items-start">
        <AccountRecentTransactions
          accountId={accountId}
          accountName={account.name}
        />
        <AccountFacts account={account} />
      </div>

      {entry === undefined || entry.ratelessCount === 0 ? null : (
        <Footnote>
          {entry.ratelessCount} holding
          {entry.ratelessCount === 1 ? " here has" : "s here have"} no rate path
          to your base currency, so the balance is short by that much.
        </Footnote>
      )}
    </div>
  )
}

function AccountConnectionStrip({ accountId }: { accountId: string }) {
  const connectors = useAccountConnectorsSuspense(useUserId())
  const connector = connectors.byAccountId[accountId]
  if (connector === undefined) return null
  return <AccountConnection connector={connector} />
}

export function AccountDetail({ accountId }: { accountId: string }) {
  const userId = useUserId()
  const account = useAccountSuspense({ userId, accountId })
  const editor = useAccountEditor()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        back={
          <PageHeaderBackLink render={<Link to="/accounts" />}>
            Accounts
          </PageHeaderBackLink>
        }
        eyebrow={`${account.accountTypeName} account`}
        title={account.name}
        meta={accountHeaderMeta(account)}
        actions={
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              editor.openEdit(accountId)
            }}
          >
            <PencilIcon aria-hidden data-icon="inline-start" />
            {EDIT_ACCOUNT}
          </Button>
        }
      />
      <div className="flex flex-col gap-[26px]">
        <PanelBoundary pending={<></>}>
          <AccountConnectionStrip accountId={accountId} />
        </PanelBoundary>

        <AccountHero
          accountId={accountId}
          accountClass={account.accountClass}
        />

        <PanelBoundary
          pending={<AccountPanelSkeleton label="Loading account" rows={5} />}
        >
          <AccountBody account={account} accountId={accountId} />
        </PanelBoundary>
      </div>
      <AccountEditor
        userId={userId}
        mode={editor.mode}
        open={editor.open}
        onOpenChange={editor.setOpen}
        onDeleted={() => {
          void navigate({ to: "/accounts" })
        }}
      />
    </>
  )
}
