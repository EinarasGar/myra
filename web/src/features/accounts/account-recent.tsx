import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"

import { useUserId } from "@/auth"
import { Figure } from "@/components/figure"
import {
  focusRing,
  HIT_TARGET_ROW,
  Panel,
  PanelBody,
  PanelFooter,
  PanelFootnote,
  PanelHeader,
  PanelNote,
  PanelTitle,
  ROW_ACTIVATION_CLASS,
  rowActivation,
  StatusChip,
  Truncate,
} from "@/components/primitives"
import { SkeletonRows } from "@/components/states/loading-state"
import type {
  LedgerFilterToken,
  LedgerTransactionRow,
} from "@/features/transactions/api"
import {
  isTransactionRow,
  nativeFigureProps,
  useLedger,
} from "@/features/transactions/api"
import { TransactionPanel } from "@/features/transactions/drawer"
import { useTransactionEditor } from "@/features/transactions/editor"
import { normalizeError } from "@/lib/errors"
import { formatDayLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const RECENT_LIMIT = 5

function RecentRow({
  row,
  onOpen,
}: {
  row: LedgerTransactionRow
  onOpen: (row: LedgerTransactionRow) => void
}) {
  return (
    <li
      data-slot="account-recent-row"
      role="button"
      aria-label={`Open ${row.description.primary}`}
      className={cn(
        "flex h-[52px] items-center gap-4 border-b border-border px-[18px] last:border-b-0",
        ROW_ACTIVATION_CLASS
      )}
      {...rowActivation<HTMLLIElement>(() => {
        onOpen(row)
      })}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Truncate
            text={row.description.primary}
            className="min-w-0 text-[13px] leading-[1.3] font-medium"
          />
          {row.isUnreviewed ? (
            <StatusChip status="unreviewed" size="row" />
          ) : null}
        </div>
        <Truncate
          text={`${row.typeName} · ${formatDayLabel(row.date)}`}
          className="block text-[11px] leading-[1.4] text-ink-3"
        />
      </div>
      {row.primaryAmount === null ? (
        <Figure value={null} size="base" emptyLabel="No amount on this entry" />
      ) : (
        <Figure
          {...nativeFigureProps(row.primaryAmount)}
          intent={row.figureIntent}
          size="base"
        />
      )}
    </li>
  )
}

export function AccountRecentTransactions({
  accountId,
  accountName,
}: {
  accountId: string
  accountName: string
}) {
  const userId = useUserId()
  const tokens = useMemo(
    (): LedgerFilterToken[] => [
      { key: "account", accountId, label: accountName },
    ],
    [accountId, accountName]
  )
  const editor = useTransactionEditor()
  const [openRow, setOpenRow] = useState<LedgerTransactionRow | null>(null)
  const ledger = useLedger({ userId, tokens, limit: RECENT_LIMIT })
  const rows = ledger.rows.slice(0, RECENT_LIMIT).filter(isTransactionRow)

  return (
    <>
      <Panel>
        <PanelHeader>
          <PanelTitle>Recent transactions</PanelTitle>
          {ledger.isPending || rows.length === 0 ? null : (
            <PanelNote className="flex items-baseline gap-[5px]">
              Newest
              <Figure
                value={rows.length}
                kind="plain"
                intent="meta"
                size="micro"
                className="text-[11px] font-normal"
              />
              {ledger.totalResults === undefined ? null : (
                <>
                  of
                  <Figure
                    value={ledger.totalResults}
                    kind="plain"
                    intent="meta"
                    size="micro"
                    className="text-[11px] font-normal"
                  />
                </>
              )}
              in this account
            </PanelNote>
          )}
        </PanelHeader>

        {ledger.isPending ? (
          <PanelBody>
            <SkeletonRows count={RECENT_LIMIT} height={38} />
          </PanelBody>
        ) : null}

        {ledger.isError ? (
          <PanelBody
            role="alert"
            className="flex items-center gap-3 text-[12px] leading-[1.5] text-ink-2"
          >
            <span aria-hidden className="flex-none font-semibold text-negative">
              △
            </span>
            <span className="min-w-0 flex-1">
              {normalizeError(ledger.error).message}
            </span>
            <button
              type="button"
              onClick={ledger.refetch}
              className={cn(
                "flex-none text-[11.5px] leading-none font-semibold text-brand outline-none",
                focusRing.chip
              )}
            >
              Try again
            </button>
          </PanelBody>
        ) : null}

        {!ledger.isPending && !ledger.isError && rows.length === 0 ? (
          <PanelBody className="text-[12px] leading-[1.5] text-ink-3">
            Nothing has been recorded against this account yet. Transactions
            posted here show up newest first.
          </PanelBody>
        ) : null}

        {rows.length === 0 ? null : (
          <>
            <ul className="list-none">
              {rows.map((row) => (
                <RecentRow key={row.rowId} row={row} onOpen={setOpenRow} />
              ))}
            </ul>
            <PanelFooter>
              <Link
                to="/transactions"
                search={{ account: accountId }}
                className={cn(
                  "min-w-0 outline-none",
                  HIT_TARGET_ROW,
                  focusRing.chip
                )}
              >
                <Truncate
                  text={`View all in ${accountName} →`}
                  className="block"
                />
              </Link>
            </PanelFooter>
          </>
        )}

        <PanelFootnote>
          Amounts are in the asset each entry moved, not converted to your base
          currency — the ledger carries no conversion. This is the per-account
          feed, which never groups transactions.
        </PanelFootnote>
      </Panel>

      <TransactionPanel
        userId={userId}
        editor={editor}
        view={{
          transactionId: openRow?.transactionId ?? null,
          open: openRow !== null,
          row: openRow,
          onOpenChange: (next) => {
            if (!next) setOpenRow(null)
          },
          onDeleted: () => {
            setOpenRow(null)
          },
        }}
      />
    </>
  )
}
