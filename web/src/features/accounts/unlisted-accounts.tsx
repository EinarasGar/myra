import { useState } from "react"

import { Figure } from "@/components/figure"
import { FoldRow, Panel, PanelFootnote } from "@/components/primitives"

import type { UnlistedAccount } from "./rows"

function shortId(accountId: string): string {
  return accountId.slice(0, 8)
}

export function UnlistedAccounts({
  accounts,
  total,
}: {
  accounts: readonly UnlistedAccount[]
  total: number
}) {
  const [open, setOpen] = useState(false)

  if (accounts.length === 0) return null

  return (
    <div data-slot="unlisted-accounts" className="flex flex-col gap-[10px]">
      <FoldRow
        total={accounts.length}
        shown={0}
        label={`${accounts.length} account${accounts.length === 1 ? "" : "s"} not in this list`}
        names="Deactivated accounts keep every transaction and stay in your net worth."
        actionLabel={open ? "Hide" : "Show"}
        onShowAll={() => {
          setOpen((previous) => !previous)
        }}
      />
      {open ? (
        <Panel>
          <ul className="list-none">
            {accounts.map((account) => (
              <li
                key={account.accountId}
                className="flex h-[48px] items-center gap-4 border-b border-border px-[18px] last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] leading-none text-ink-2">
                  {shortId(account.accountId)}
                </span>
                <span className="flex-none text-[11px] leading-none text-ink-3">
                  {account.holdingCount} holding
                  {account.holdingCount === 1 ? "" : "s"}
                </span>
                <Figure value={account.value} size="base" />
              </li>
            ))}
          </ul>
          <PanelFootnote>
            Deactivating an account hides it from your list but keeps its
            holdings, so these are the only ones we can still see — an account
            with nothing in it leaves no trace. The API cannot return their
            names. Together they hold{" "}
            <Figure value={total} size="micro" intent="secondary" />.
          </PanelFootnote>
        </Panel>
      ) : null}
    </div>
  )
}
