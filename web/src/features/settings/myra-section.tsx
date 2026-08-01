import { useUserId } from "@/auth"
import { MOCK_MYRA_PERMISSIONS, mockAttributes, MockBadge } from "@/lib/mock"
import { Figure } from "@/components/figure"
import { PanelBoundary } from "@/components/layout/route-boundaries"
import { MetaChip } from "@/components/primitives"
import { Switch } from "@/components/ui/switch"

import type { UsageMetricView, UsageWindowView } from "./api"
import { quotaTone, useAiUsageSuspense } from "./api"
import {
  SettingsBlock,
  SettingsBlocks,
  SettingsList,
  SettingsListRow,
  SettingsQuota,
  SettingsQuotaBar,
  SettingsQuotaWindow,
} from "./blocks"
import {
  MYRA_APPROVAL_CONSEQUENCE,
  MYRA_PERMISSION_UNSTORED,
  QUOTA_CONSEQUENCE,
} from "./copy"
import { resetLabel } from "./presentation"
import { SettingsQuotaSkeleton } from "./skeletons"

const MYRA_PERMISSIONS_MOCK = "settings.myra-permissions"

function MetricValue({ metric }: { metric: UsageMetricView }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Figure value={metric.used} kind="plain" intent="meta" size="micro" />
      <span>of</span>
      <Figure value={metric.limit} kind="plain" intent="meta" size="micro" />
      <span aria-hidden>·</span>
      <Figure
        value={metric.ratio}
        kind="percent"
        scale="ratio"
        decimals={0}
        intent="meta"
        size="micro"
      />
    </span>
  )
}

function UsageWindow({ window }: { window: UsageWindowView }) {
  return (
    <SettingsQuotaWindow
      title={window.label}
      reset={resetLabel(window.resetAt)}
    >
      <SettingsQuotaBar
        label="Input tokens"
        value={<MetricValue metric={window.input} />}
        ratio={window.input.ratio}
        tone={quotaTone(window.input.ratio)}
      />
      <SettingsQuotaBar
        label="Output tokens"
        value={<MetricValue metric={window.output} />}
        ratio={window.output.ratio}
        tone={quotaTone(window.output.ratio)}
      />
    </SettingsQuotaWindow>
  )
}

function UsageBlock() {
  const usage = useAiUsageSuspense(useUserId())
  return (
    <SettingsQuota footnote={QUOTA_CONSEQUENCE}>
      {usage.windows.map((window) => (
        <UsageWindow key={window.id} window={window} />
      ))}
    </SettingsQuota>
  )
}

/**
 * Both switches are `disabled`: there is nowhere to persist them, and a switch that
 * moves and then silently forgets would be a worse lie than one that cannot move.
 */
function PermissionsBlock() {
  return (
    <SettingsList>
      <SettingsListRow
        label="Approval required for every write"
        chip={<MetaChip tone="brand">Always on</MetaChip>}
        consequence={MYRA_APPROVAL_CONSEQUENCE}
      />
      <SettingsListRow
        {...mockAttributes(MYRA_PERMISSIONS_MOCK)}
        label="Read receipts I upload"
        chip={<MockBadge id={MYRA_PERMISSIONS_MOCK} label="Not stored" />}
        consequence={`Reads receipt photos and drafts a transaction from them, with a correction chat before you save. ${MYRA_PERMISSION_UNSTORED}`}
        control={
          <Switch
            checked={MOCK_MYRA_PERMISSIONS.quickUploadEnabled}
            disabled
            aria-label="Read receipts I upload (placeholder, cannot be saved)"
          />
        }
      />
      <SettingsListRow
        {...mockAttributes(MYRA_PERMISSIONS_MOCK)}
        label="Use my history for suggestions"
        chip={<MockBadge id={MYRA_PERMISSIONS_MOCK} label="Not stored" />}
        consequence={`Matches merchants and categories against your past transactions when reviewing imports. ${MYRA_PERMISSION_UNSTORED}`}
        control={
          <Switch
            checked={MOCK_MYRA_PERMISSIONS.useHistoryForSuggestions}
            disabled
            aria-label="Use my history for suggestions (placeholder, cannot be saved)"
          />
        }
      />
    </SettingsList>
  )
}

export function MyraSection() {
  return (
    <SettingsBlocks>
      <SettingsBlock title="Usage" note="resets automatically">
        <PanelBoundary pending={<SettingsQuotaSkeleton />}>
          <UsageBlock />
        </PanelBoundary>
      </SettingsBlock>

      <SettingsBlock title="What Myra may do">
        <PermissionsBlock />
      </SettingsBlock>
    </SettingsBlocks>
  )
}
