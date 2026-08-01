import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"

import { useUserId } from "@/auth"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { EmptyState } from "@/components/states/empty-state"
import { Button } from "@/components/ui/button"
import type { DeletableAccount } from "@/features/accounts"
import {
  AccountDeleteDialog,
  AccountEditor,
  NEW_ACCOUNT,
  SETTINGS_ACCOUNTS_EMPTY_BODY,
  SETTINGS_ACCOUNTS_EMPTY_HEADLINE,
  SETTINGS_ACCOUNTS_FOOTNOTE,
  useAccountEditor,
} from "@/features/accounts"
import type { AccountSummary } from "@/features/accounts/api"
import { useAccountsSuspense } from "@/features/accounts/api"

import {
  SettingsBlock,
  SettingsBlocks,
  SettingsList,
  SettingsListRow,
} from "./blocks"
import { SettingsGroupsSkeleton } from "./skeletons"

function accountRowMeta(account: AccountSummary): string {
  const parts = [account.accountTypeName ?? "Unknown type"]
  parts.push(account.isLiquid ? "spendable today" : "not spendable today")
  parts.push(
    account.isJoint
      ? `your ${String(Math.round(account.ownershipSharePercent))}% share`
      : "entirely yours"
  )
  return parts.join(" · ")
}

function AccountsBlock() {
  const userId = useUserId()
  const accounts = useAccountsSuspense(userId)
  const editor = useAccountEditor()
  const [pendingDelete, setPendingDelete] = useState<DeletableAccount | null>(
    null
  )

  return (
    <SettingsBlock
      title="Your accounts"
      note={`${String(accounts.count)} active · ${String(accounts.jointCount)} shared`}
      action={
        <Button
          variant="ghost"
          size="xs"
          className="text-brand hover:text-brand"
          onClick={editor.openCreate}
        >
          <PlusIcon aria-hidden className="size-3" />
          {NEW_ACCOUNT}
        </Button>
      }
    >
      {accounts.count === 0 ? (
        <EmptyState
          headline={SETTINGS_ACCOUNTS_EMPTY_HEADLINE}
          body={SETTINGS_ACCOUNTS_EMPTY_BODY}
          actions={[
            {
              label: "Add your first account",
              kind: "primary",
              onClick: editor.openCreate,
            },
          ]}
          footnote={SETTINGS_ACCOUNTS_FOOTNOTE}
        />
      ) : (
        <SettingsList footnote={SETTINGS_ACCOUNTS_FOOTNOTE}>
          {accounts.accounts.map((account) => (
            <SettingsListRow
              key={account.accountId}
              label={account.name}
              consequence={accountRowMeta(account)}
              control={
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    render={
                      <Link
                        to="/accounts/$accountId"
                        params={{ accountId: account.accountId }}
                      />
                    }
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      editor.openEdit(account.accountId)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-negative hover:text-negative"
                    onClick={() => {
                      setPendingDelete({
                        accountId: account.accountId,
                        name: account.name,
                      })
                    }}
                  >
                    Deactivate
                  </Button>
                </>
              }
            />
          ))}
        </SettingsList>
      )}

      <AccountEditor
        userId={userId}
        mode={editor.mode}
        open={editor.open}
        onOpenChange={editor.setOpen}
      />
      <AccountDeleteDialog
        userId={userId}
        account={pendingDelete}
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      />
    </SettingsBlock>
  )
}

export function AccountsSection() {
  return (
    <SettingsBlocks>
      <PanelBoundary pending={<SettingsGroupsSkeleton />}>
        <AccountsBlock />
      </PanelBoundary>
    </SettingsBlocks>
  )
}
