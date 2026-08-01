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
  EntityMark,
  FigureCell,
  MetaChip,
  Panel,
  PanelFootnote,
  SectionHeader,
  TableFoldRow,
  Truncate,
} from "@/components/primitives"
import { formatDateStamp } from "@/lib/format"
import { cn } from "@/lib/utils"

import { LOTS_CLOSED_NOTE, LOTS_FOOTNOTE } from "./copy"
import type { LotRow, LotTotals } from "./lots"
import {
  LOT_COLUMNS,
  LOT_GAP,
  LOT_PADDING,
  lotColumns,
  lotRowHeight,
  lotTrackCount,
} from "./presentation"

export interface LotsTableProps {
  rows: readonly LotRow[]
  totals: LotTotals
  currency: string
  ticker: string | null
  shown: number
  onShowAll: () => void
}

export function LotsTable({
  rows,
  totals,
  currency,
  ticker,
  shown,
  onShowAll,
}: LotsTableProps) {
  const width = useShellWidth()
  const columns = lotColumns(width)
  const tracks = lotTrackCount(width)
  const rowHeight = lotRowHeight(width)
  const drawn = rows.slice(0, shown)

  return (
    <section data-slot="purchase-lots">
      <SectionHeader
        label="Purchase lots"
        note={`${String(totals.openCount)} open, ${String(totals.closedCount)} closed · oldest first`}
      />
      <Panel>
        <DataTable
          columns={LOT_COLUMNS}
          gap={LOT_GAP}
          padding={LOT_PADDING}
          aria-label="Purchase lots"
        >
          <DataTableHead>
            <DataTableHeaderRow>
              <DataTableHeaderCell>Bought</DataTableHeaderCell>
              <DataTableHeaderCell>Account</DataTableHeaderCell>
              {columns.showUnitsLeft ? (
                <DataTableHeaderCell numeric>Units left</DataTableHeaderCell>
              ) : null}
              {columns.showBuyPrice ? (
                <DataTableHeaderCell numeric>Buy price</DataTableHeaderCell>
              ) : null}
              {columns.showCostBasis ? (
                <DataTableHeaderCell numeric>Cost basis</DataTableHeaderCell>
              ) : null}
              {columns.showUnrealised ? (
                <DataTableHeaderCell numeric>Unrealised</DataTableHeaderCell>
              ) : null}
              {columns.showRealised ? (
                <DataTableHeaderCell numeric>Realised</DataTableHeaderCell>
              ) : null}
              <DataTableHeaderCell numeric>Total</DataTableHeaderCell>
              {columns.showReturn ? (
                <DataTableHeaderCell numeric>%</DataTableHeaderCell>
              ) : null}
              {columns.showFees ? (
                <DataTableHeaderCell numeric>Fees</DataTableHeaderCell>
              ) : null}
            </DataTableHeaderRow>
          </DataTableHead>

          <DataTableBody>
            {drawn.map((row) => {
              const { lot } = row
              const ghost = row.isClosed ? "ghost" : "neutral"
              const partial = lot.unitsSold > 0 && !lot.isClosed

              return (
                <DataRow
                  key={row.key}
                  data-closed={row.isClosed || undefined}
                  variant={row.isClosed ? "ghost" : "default"}
                  size={columns.isTwoLine ? "two-line" : "financial"}
                  className={rowHeight}
                >
                  <DataCell
                    className={cn(
                      "font-mono text-[11.5px] leading-none font-medium",
                      row.isClosed && "text-ghost"
                    )}
                  >
                    {formatDateStamp(lot.addedAt, { year: "always" })}
                  </DataCell>

                  <DataCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <EntityMark
                        seed={lot.accountId}
                        label={row.accountLabel}
                      />
                      <Truncate
                        text={row.accountLabel}
                        className={cn(
                          "min-w-0 text-[12px] leading-[1.3]",
                          row.isClosed && "text-ghost"
                        )}
                      />
                      {row.isClosed ? (
                        <MetaChip tone="ghost" size="row">
                          Closed
                        </MetaChip>
                      ) : null}
                    </div>
                    {columns.showCostBasis ? null : (
                      <Truncate className="block font-mono text-[11px] leading-[1.4] text-ink-3">
                        <Figure
                          value={lot.unitsRemaining}
                          kind="units"
                          ticker={ticker}
                          intent="meta"
                          size="micro"
                          className="text-[11px]"
                        />
                        {" left · cost "}
                        <Figure
                          value={lot.totalCostBasis}
                          currency={currency}
                          intent="meta"
                          size="micro"
                          className="text-[11px]"
                        />
                      </Truncate>
                    )}
                  </DataCell>

                  {columns.showUnitsLeft ? (
                    <FigureCell>
                      <Figure
                        value={lot.unitsRemaining}
                        kind="units"
                        intent={ghost}
                        size="base"
                        className="text-[12px]"
                        aria-label={`${ticker ?? "units"} left in this lot`}
                      />
                      {partial || lot.isClosed ? (
                        <div className="mt-[5px] text-ink-3">
                          {"of "}
                          <Figure
                            value={lot.unitsAdded}
                            kind="units"
                            intent="meta"
                            size="micro"
                          />
                        </div>
                      ) : null}
                    </FigureCell>
                  ) : null}

                  {columns.showBuyPrice ? (
                    <FigureCell>
                      <Figure
                        value={lot.addPrice}
                        currency={currency}
                        intent={ghost}
                        size="base"
                        className="text-[12px]"
                      />
                    </FigureCell>
                  ) : null}

                  {columns.showCostBasis ? (
                    <FigureCell>
                      <Figure
                        value={lot.totalCostBasis}
                        currency={currency}
                        intent={ghost}
                        size="base"
                        className="text-[12px]"
                      />
                    </FigureCell>
                  ) : null}

                  {columns.showUnrealised ? (
                    <FigureCell>
                      <Figure
                        value={lot.unrealisedGains}
                        currency={currency}
                        intent="gainLoss"
                        size="base"
                        className="text-[12.5px]"
                      />
                    </FigureCell>
                  ) : null}

                  {columns.showRealised ? (
                    <FigureCell>
                      <Figure
                        value={lot.realisedGains}
                        currency={currency}
                        intent="gainLoss"
                        size="base"
                        className="text-[12.5px]"
                      />
                    </FigureCell>
                  ) : null}

                  <FigureCell>
                    <Figure
                      value={lot.totalGains}
                      currency={currency}
                      intent="gainLoss"
                      size="base"
                      className="text-[12.5px] font-semibold"
                    />
                  </FigureCell>

                  {columns.showReturn ? (
                    <FigureCell>
                      <Figure
                        value={lot.returnRatio}
                        kind="percent"
                        scale="ratio"
                        intent="gainLoss"
                        size="base"
                        className="text-[12px]"
                        emptyLabel="Not applicable to a closed lot"
                      />
                    </FigureCell>
                  ) : null}

                  {columns.showFees ? (
                    <FigureCell>
                      <Figure
                        value={lot.fees}
                        currency={currency}
                        intent={ghost}
                        size="base"
                        className="text-[12px]"
                      />
                    </FigureCell>
                  ) : null}
                </DataRow>
              )
            })}

            <TableFoldRow
              total={rows.length}
              shown={drawn.length}
              span={tracks}
              onShowAll={onShowAll}
            />

            <DataRow
              variant="totals"
              size={columns.isTwoLine ? "two-line" : "financial"}
              className={cn(rowHeight, "border-b-0")}
            >
              <DataCell className="text-[11.5px] leading-none font-semibold">
                Total
              </DataCell>
              <DataCell className="text-[11px] leading-[1.3] text-ink-3">
                {totals.openCount} open, {totals.closedCount} closed
              </DataCell>

              {columns.showUnitsLeft ? (
                <FigureCell>
                  <Figure
                    value={totals.unitsRemaining}
                    kind="units"
                    size="base"
                    className="text-[12px] font-semibold"
                    aria-label={`${ticker ?? "units"} left across every lot`}
                  />
                </FigureCell>
              ) : null}

              {columns.showBuyPrice ? (
                <FigureCell>
                  <Figure
                    value={totals.averageUnitCost}
                    currency={currency}
                    intent="meta"
                    size="base"
                    className="text-[12px]"
                  />
                </FigureCell>
              ) : null}

              {columns.showCostBasis ? (
                <FigureCell>
                  <Figure
                    value={totals.totalCostBasis}
                    currency={currency}
                    size="base"
                    className="text-[12px] font-semibold"
                  />
                </FigureCell>
              ) : null}

              {columns.showUnrealised ? (
                <FigureCell>
                  <Figure
                    value={totals.unrealisedGains}
                    currency={currency}
                    intent="gainLoss"
                    size="base"
                    className="text-[12.5px] font-semibold"
                  />
                </FigureCell>
              ) : null}

              {columns.showRealised ? (
                <FigureCell>
                  <Figure
                    value={totals.realisedGains}
                    currency={currency}
                    intent="gainLoss"
                    size="base"
                    className="text-[12.5px] font-semibold"
                  />
                </FigureCell>
              ) : null}

              <FigureCell>
                <Figure
                  value={totals.totalGains}
                  currency={currency}
                  intent="gainLoss"
                  size="base"
                  className="text-[12.5px] font-bold"
                />
              </FigureCell>

              {columns.showReturn ? (
                <FigureCell>
                  <Figure
                    value={totals.returnRatio}
                    kind="percent"
                    scale="ratio"
                    intent="gainLoss"
                    size="base"
                    className="text-[12px] font-semibold"
                  />
                </FigureCell>
              ) : null}

              {columns.showFees ? (
                <FigureCell>
                  <Figure
                    value={totals.totalFees}
                    currency={currency}
                    size="base"
                    className="text-[12px] font-semibold"
                  />
                </FigureCell>
              ) : null}
            </DataRow>
          </DataTableBody>
        </DataTable>
        <PanelFootnote>
          {LOTS_FOOTNOTE} {LOTS_CLOSED_NOTE}
        </PanelFootnote>
      </Panel>
    </section>
  )
}
