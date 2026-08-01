import { Fragment, type KeyboardEvent } from "react"
import { Link } from "@tanstack/react-router"

import type { SeriesColors } from "@/components/chart"
import { SeriesSwatch, ShareBar } from "@/components/chart"
import { Figure } from "@/components/figure"
import { useShellWidth } from "@/components/layout/breakpoints"
import {
  DataCell,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableHeaderRow,
  DisclosureCaret,
  EntityMark,
  FigureCell,
  Panel,
  PanelFootnote,
  TableFoldRow,
  Truncate,
} from "@/components/primitives"
import { TableCell, TableRow } from "@/components/ui/table"
import { mockAttributes, MockBadge } from "@/lib/mock"
import { countOf } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  HOLDINGS_FOOTNOTE,
  PERIOD_COLUMN_FOOTNOTE,
  PERIOD_COLUMN_UNAVAILABLE_FOOTNOTE,
  SHARE_BASIS_FOOTNOTE,
} from "./copy"
import type { HoldingsSummary, PortfolioHoldingRow } from "./holdings"
import { lotSummaryOf } from "./holdings"
import type { PeriodColumn } from "./period"
import type { HoldingsColumns } from "./presentation"
import {
  HOLDINGS_COLUMNS,
  HOLDINGS_GAP,
  HOLDINGS_PADDING,
  holdingsColumns,
  holdingsRowHeight,
  holdingsTrackCount,
} from "./presentation"

export interface HoldingsTableProps {
  summary: HoldingsSummary
  period: PeriodColumn
  colors: SeriesColors
  currency: string
  expanded: ReadonlySet<string>
  onToggle: (key: string) => void
  shown: number
  onShowAll: () => void
}

function activate(event: KeyboardEvent<HTMLTableRowElement>, run: () => void) {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  run()
}

export function HoldingsTable({
  summary,
  period,
  colors,
  currency,
  expanded,
  onToggle,
  shown,
  onShowAll,
}: HoldingsTableProps) {
  const width = useShellWidth()
  const columns = holdingsColumns(width)
  const tracks = holdingsTrackCount(width)
  const rowHeight = holdingsRowHeight(width)
  const rows = summary.rows.slice(0, shown)

  return (
    <Panel>
      <DataTable
        columns={HOLDINGS_COLUMNS}
        gap={HOLDINGS_GAP}
        padding={HOLDINGS_PADDING}
        aria-label="Holdings"
      >
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeaderCell>Asset</DataTableHeaderCell>
            {columns.showUnits ? (
              <DataTableHeaderCell numeric>Units</DataTableHeaderCell>
            ) : null}
            <DataTableHeaderCell numeric>Value</DataTableHeaderCell>
            {columns.showShare ? (
              <DataTableHeaderCell numeric>Share</DataTableHeaderCell>
            ) : null}
            {columns.showPeriod ? (
              <DataTableHeaderCell numeric {...mockAttributes(period.mockId)}>
                <span className="inline-flex items-center gap-[5px]">
                  {period.label}
                  <MockBadge id={period.mockId} />
                </span>
              </DataTableHeaderCell>
            ) : null}
            {columns.showLifetime ? (
              <DataTableHeaderCell numeric>
                Since you bought
              </DataTableHeaderCell>
            ) : null}
            {columns.showCaret ? <DataTableHeaderCell /> : null}
          </DataTableHeaderRow>
        </DataTableHead>

        <DataTableBody>
          {rows.map((row) => {
            const open = expanded.has(row.key)
            const change = period.byHolding[row.key]
            const colour = colors.colorFor(row.key)

            return (
              <Fragment key={row.key}>
                <DataRow
                  size="two-line"
                  variant={open ? "group" : "default"}
                  interactive
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => {
                    onToggle(row.key)
                  }}
                  onKeyDown={(event) => {
                    activate(event, () => {
                      onToggle(row.key)
                    })
                  }}
                  className={rowHeight}
                >
                  <DataCell>
                    <div className="flex min-w-0 items-center gap-[11px]">
                      <SeriesSwatch color={colour} />
                      <Truncate
                        text={row.label}
                        className="min-w-0 text-[13px] leading-[1.3] font-medium"
                      />
                    </div>
                    <Truncate className="block ps-[19px] font-mono text-[11px] leading-[1.4] text-ink-3">
                      {row.subLabel}
                      {columns.showUnits ? null : (
                        <>
                          {" · "}
                          <Figure
                            value={row.units}
                            kind="units"
                            ticker={row.asset?.ticker ?? null}
                            intent="meta"
                            size="micro"
                            className="text-[11px]"
                          />
                        </>
                      )}
                    </Truncate>
                  </DataCell>

                  {columns.showUnits ? (
                    <FigureCell>
                      <Figure
                        value={row.units}
                        kind="units"
                        intent="secondary"
                        size="base"
                        className="text-[12.5px]"
                        aria-label={`${row.label} units held`}
                      />
                    </FigureCell>
                  ) : null}

                  <FigureCell>
                    <Figure
                      value={row.value}
                      currency={currency}
                      size="base"
                      className="font-semibold"
                    />
                    {columns.showLifetime ? null : (
                      <div className="mt-[5px]">
                        <Figure
                          value={row.lifetime?.totalGains ?? null}
                          currency={currency}
                          intent="gainLoss"
                          size="micro"
                        />
                      </div>
                    )}
                  </FigureCell>

                  {columns.showShare ? (
                    <DataCell className="overflow-visible">
                      <Figure
                        value={row.share}
                        kind="percent"
                        scale="ratio"
                        intent="secondary"
                        size="micro"
                        className="block text-right text-[11.5px]"
                      />
                      {row.share > 0 ? (
                        <ShareBar
                          value={row.share}
                          color={colour}
                          label={`${row.label} is ${String(Math.round(row.share * 100))}% of everything you hold`}
                          className="mt-[6px]"
                        />
                      ) : null}
                    </DataCell>
                  ) : null}

                  {columns.showPeriod ? (
                    <FigureCell {...mockAttributes(period.mockId)}>
                      <Figure
                        value={change?.amount ?? null}
                        currency={currency}
                        intent="gainLoss"
                        size="base"
                        className="text-[13px]"
                      />
                      <div className="mt-[5px]">
                        <Figure
                          value={change?.ratio ?? null}
                          kind="percent"
                          scale="ratio"
                          intent="gainLoss"
                          size="micro"
                        />
                      </div>
                    </FigureCell>
                  ) : null}

                  {columns.showLifetime ? (
                    <FigureCell>
                      <Figure
                        value={row.lifetime?.totalGains ?? null}
                        currency={currency}
                        intent="gainLoss"
                        size="base"
                        className="text-[13px]"
                      />
                      <div className="mt-[5px]">
                        <Figure
                          value={row.lifetime?.returnRatio ?? null}
                          kind="percent"
                          scale="ratio"
                          intent="gainLoss"
                          size="micro"
                        />
                      </div>
                    </FigureCell>
                  ) : null}

                  {columns.showCaret ? (
                    <DataCell>
                      <DisclosureCaret expanded={open} />
                    </DataCell>
                  ) : null}
                </DataRow>

                {open ? (
                  <HoldingDisclosure
                    row={row}
                    period={period}
                    colour={colour}
                    currency={currency}
                    columns={columns}
                    span={tracks}
                  />
                ) : null}
              </Fragment>
            )
          })}

          <TableFoldRow
            total={summary.rows.length}
            shown={rows.length}
            span={tracks}
            onShowAll={onShowAll}
          />

          <DataRow
            variant="totals"
            size="two-line"
            className={cn(rowHeight, "border-b-0")}
          >
            <DataCell className="text-[12px] leading-none font-semibold">
              Total
            </DataCell>
            {columns.showUnits ? <DataCell /> : null}
            <FigureCell>
              <Figure
                value={summary.totalValue}
                currency={currency}
                size="base"
                className="text-[14px] font-bold"
              />
            </FigureCell>
            {columns.showShare ? (
              <FigureCell>
                <Figure
                  value={
                    summary.shareBasis === 0
                      ? null
                      : summary.totalValue / summary.shareBasis
                  }
                  kind="percent"
                  scale="ratio"
                  intent="meta"
                  size="micro"
                  className="text-[11.5px]"
                />
              </FigureCell>
            ) : null}
            {columns.showPeriod ? (
              <FigureCell {...mockAttributes(period.mockId)}>
                <Figure
                  value={period.total}
                  currency={currency}
                  intent="gainLoss"
                  size="base"
                  className="text-[13px] font-semibold"
                />
              </FigureCell>
            ) : null}
            {columns.showLifetime ? (
              <FigureCell>
                <Figure
                  value={summary.totalGains}
                  currency={currency}
                  intent="gainLoss"
                  size="base"
                  className="text-[13px] font-semibold"
                />
              </FigureCell>
            ) : null}
            {columns.showCaret ? <DataCell /> : null}
          </DataRow>
        </DataTableBody>
      </DataTable>

      <PanelFootnote>
        {HOLDINGS_FOOTNOTE}
        {columns.showShare && summary.hasNegativeRow
          ? ` ${SHARE_BASIS_FOOTNOTE}`
          : ""}
        {columns.showPeriod
          ? ` ${period.total === null ? PERIOD_COLUMN_UNAVAILABLE_FOOTNOTE : PERIOD_COLUMN_FOOTNOTE}`
          : ""}
      </PanelFootnote>
    </Panel>
  )
}

function HoldingDisclosure({
  row,
  period,
  colour,
  currency,
  columns,
  span,
}: {
  row: PortfolioHoldingRow
  period: PeriodColumn
  colour: string
  currency: string
  columns: HoldingsColumns
  span: number
}) {
  const lifetime = row.lifetime
  const summary = lifetime === null ? null : lotSummaryOf(lifetime)

  return (
    <TableRow
      data-slot="holding-disclosure"
      className="block border-b border-border bg-surface-2"
    >
      <TableCell
        aria-colspan={span}
        className="block px-[var(--dt-pad)] pt-[4px] pb-[14px]"
      >
        <div role="list" aria-label={`${row.label} by account`}>
          {row.accounts.map((account) => (
            <div
              key={account.key}
              role="listitem"
              data-slot="holding-account"
              className="grid h-[40px] grid-cols-[var(--dt-cols)] items-center gap-[var(--dt-gap)] border-b border-border"
            >
              <div className="flex min-w-0 items-center gap-[11px] ps-[19px]">
                <span
                  aria-hidden
                  className="block h-[40px] w-px flex-none"
                  style={{ backgroundColor: colour }}
                />
                {account.account === null ? null : (
                  <EntityMark
                    seed={account.account.accountId}
                    label={account.label}
                  />
                )}
                <Truncate
                  text={account.label}
                  className="min-w-0 text-[12.5px] leading-none text-ink-2"
                />
                {columns.showUnits ? null : (
                  <Figure
                    value={account.units}
                    kind="units"
                    ticker={row.asset?.ticker ?? null}
                    intent="meta"
                    size="micro"
                    className="flex-none text-[11px]"
                  />
                )}
              </div>

              {columns.showUnits ? (
                <span className="text-right">
                  <Figure
                    value={account.units}
                    kind="units"
                    ticker={row.asset?.ticker ?? null}
                    intent="meta"
                    size="micro"
                    className="text-[12px]"
                  />
                </span>
              ) : null}

              <span className="text-right">
                <Figure
                  value={account.value}
                  currency={currency}
                  intent="secondary"
                  size="micro"
                  className="text-[12.5px]"
                />
              </span>

              {columns.showShare ? <span /> : null}

              {columns.showPeriod ? (
                <span className="text-right" {...mockAttributes(period.mockId)}>
                  <Figure
                    value={period.byAccount[account.key]?.amount ?? null}
                    currency={currency}
                    intent="gainLoss"
                    size="micro"
                    className="text-[12px]"
                  />
                </span>
              ) : null}

              {columns.showLifetime ? (
                <span className="text-right">
                  <Figure
                    value={account.position?.totalGains ?? null}
                    currency={currency}
                    intent="gainLoss"
                    size="micro"
                    className="text-[12px]"
                  />
                </span>
              ) : null}

              {columns.showCaret ? <span /> : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-1 ps-[31px] pt-[12px]">
          {summary === null ? (
            <span className="text-[11.5px] leading-[1.4] text-ink-3">
              No purchase lots — this is a balance, not a position, so it has no
              cost basis and no profit.
            </span>
          ) : (
            <span className="text-[11.5px] leading-[1.4] text-ink-3">
              {countOf(summary.lotCount, "lot")}
              {" · average cost "}
              <Figure
                value={summary.averageUnitCost}
                currency={currency}
                intent="meta"
                size="micro"
                className="text-[11.5px]"
              />
              {" · realised "}
              <Figure
                value={summary.realisedGains}
                currency={currency}
                intent="gainLoss"
                size="micro"
                className="text-[11.5px]"
              />
              {" · fees "}
              <Figure
                value={summary.totalFees}
                currency={currency}
                intent="meta"
                size="micro"
                className="text-[11.5px]"
              />
            </span>
          )}
          <Link
            to="/portfolio/$assetId"
            params={{ assetId: String(row.assetId) }}
            className="flex-none text-[11.5px] leading-none font-semibold whitespace-nowrap text-brand"
          >
            Open asset →
          </Link>
        </div>
      </TableCell>
    </TableRow>
  )
}
