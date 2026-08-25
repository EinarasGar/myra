import { useUserId } from "@/auth"
import type { ExportFormat, IdentifiableExport } from "@/api"
import { Button } from "@/components/ui/button"
import { MetaChip } from "@/components/primitives"
import { formatBytes } from "@/features/uploads"
import { formatDateStamp } from "@/lib/format"

import {
  SettingsBlock,
  SettingsBlocks,
  SettingsList,
  SettingsListRow,
} from "./blocks"
import { useCreateExport, useExportDownload, useExports } from "./api/exports"

const EMPTY_EXPORTS_COPY = "No exports yet."

function formatLabel(format: ExportFormat): string {
  return format === "csv" ? "CSV" : "Beancount"
}

function ExportActions() {
  const userId = useUserId()
  const createExport = useCreateExport(userId)

  return (
    <div className="flex flex-wrap items-center gap-[10px]">
      <Button
        variant="outline"
        disabled={createExport.isPending}
        onClick={() => {
          createExport.mutate({ format: "csv" })
        }}
      >
        Export CSV
      </Button>
      <Button
        variant="outline"
        disabled={createExport.isPending}
        onClick={() => {
          createExport.mutate({ format: "beancount" })
        }}
      >
        Export Beancount
      </Button>
    </div>
  )
}

function ExportRow({
  userId,
  row,
}: {
  userId: string
  row: IdentifiableExport
}) {
  const download = useExportDownload(userId)

  return (
    <SettingsListRow
      label={formatLabel(row.format)}
      chip={<MetaChip tone="brand">{formatLabel(row.format)}</MetaChip>}
      consequence={`${formatDateStamp(row.created_at, {
        year: "always",
      })} · ${formatBytes(row.size_bytes)}`}
      control={
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            void download(row)
          }}
        >
          Download
        </Button>
      }
    />
  )
}

function PreviousExports() {
  const userId = useUserId()
  const exports = useExports(userId)

  const rows = exports.data ?? []

  if (rows.length === 0) {
    return (
      <SettingsList>
        <SettingsListRow label={EMPTY_EXPORTS_COPY} />
      </SettingsList>
    )
  }

  return (
    <SettingsList>
      {rows.map((row) => (
        <ExportRow key={row.id} userId={userId} row={row} />
      ))}
    </SettingsList>
  )
}

export function DataSection() {
  return (
    <SettingsBlocks>
      <SettingsBlock title="Export">
        <ExportActions />
      </SettingsBlock>

      <SettingsBlock title="Previous exports">
        <PreviousExports />
      </SettingsBlock>
    </SettingsBlocks>
  )
}
