import { useState } from "react"

import { useUserId } from "@/auth"
import { Figure } from "@/components/figure"
import {
  DataCell,
  DataRow,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableHeaderRow,
  FigureCell,
  Panel,
  PanelFootnote,
  TableFoldRow,
} from "@/components/primitives"
import { EmptyState } from "@/components/states/empty-state"
import { Button } from "@/components/ui/button"
import { formatDateStamp } from "@/lib/format"

import type { RatePoint } from "./api"
import { useAddManualRates, useDeleteManualRates } from "./api"
import { valuationRemovedToast, valuationRestoredToast } from "./toasts"
import {
  ADD_VALUATION_LABEL,
  VALUATION_FOOTNOTE,
  valuationHistoryEmptyBody,
  VALUATION_ROWS_DRAWN,
  VALUATION_ROWS_PER_FOLD,
  valuationFoldLabel,
} from "./valuation"

const HISTORY_COLUMNS = {
  full: "minmax(140px,1fr) minmax(120px,auto) 96px",
  phone: "minmax(88px,1fr) minmax(76px,auto) 76px",
}

function toSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function ValuationHistory({
  assetId,
  referenceId,
  referenceTicker,
  rates,
  hasPeriodControl,
  onAdd,
}: {
  assetId: number
  referenceId: number
  referenceTicker: string
  rates: readonly RatePoint[]
  hasPeriodControl: boolean
  onAdd: () => void
}) {
  const userId = useUserId()
  const remove = useDeleteManualRates(userId)
  const restore = useAddManualRates(userId)
  const [shown, setShown] = useState(VALUATION_ROWS_DRAWN)

  if (rates.length === 0) {
    return (
      <EmptyState
        headline={
          hasPeriodControl
            ? "Nothing recorded in this window"
            : "No valuations yet"
        }
        body={valuationHistoryEmptyBody(hasPeriodControl)}
        actions={[
          { label: ADD_VALUATION_LABEL, kind: "primary", onClick: onAdd },
        ]}
        footnote={VALUATION_FOOTNOTE}
      />
    )
  }

  const ordered = [...rates].sort((a, b) => b.date.getTime() - a.date.getTime())
  const drawn = ordered.slice(0, shown)

  return (
    <Panel>
      <DataTable columns={HISTORY_COLUMNS} aria-label="Valuations you entered">
        <DataTableHead>
          <DataTableHeaderRow>
            <DataTableHeaderCell>Valued on</DataTableHeaderCell>
            <DataTableHeaderCell numeric>
              Rate in {referenceTicker}
            </DataTableHeaderCell>
            <DataTableHeaderCell>
              <span className="sr-only">Remove</span>
            </DataTableHeaderCell>
          </DataTableHeaderRow>
        </DataTableHead>
        <DataTableBody>
          {drawn.map((point) => {
            const stamp = formatDateStamp(point.date, { year: "always" })
            const at = toSeconds(point.date)
            return (
              <DataRow key={at} size="financial">
                <DataCell className="font-mono text-[11.5px] leading-none font-medium">
                  {stamp}
                </DataCell>
                <FigureCell>
                  <Figure
                    value={point.rate}
                    kind="money"
                    currency={referenceTicker}
                  />
                </FigureCell>
                <DataCell className="text-right">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-ink-3 hover:text-negative"
                    disabled={remove.isPending}
                    onClick={() => {
                      remove.mutate(
                        {
                          assetId,
                          referenceId,
                          startTimestamp: at,
                          endTimestamp: at,
                        },
                        {
                          onSuccess: () => {
                            valuationRemovedToast({
                              stamp,
                              onUndo: () => {
                                restore.mutate(
                                  {
                                    assetId,
                                    referenceId,
                                    rates: [{ date: at, rate: point.rate }],
                                  },
                                  {
                                    onSuccess: () => {
                                      valuationRestoredToast(stamp)
                                    },
                                  }
                                )
                              },
                            })
                          },
                        }
                      )
                    }}
                  >
                    Remove
                  </Button>
                </DataCell>
              </DataRow>
            )
          })}
          <TableFoldRow
            span={3}
            total={ordered.length}
            shown={drawn.length}
            label={valuationFoldLabel(ordered.length - drawn.length)}
            onShowAll={() => {
              setShown(drawn.length + VALUATION_ROWS_PER_FOLD)
            }}
          />
        </DataTableBody>
      </DataTable>
      <PanelFootnote>{VALUATION_FOOTNOTE}</PanelFootnote>
    </Panel>
  )
}
