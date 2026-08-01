import { Panel } from "@/components/primitives"
import {
  LoadingState,
  SkeletonBar,
  SkeletonRows,
} from "@/components/states/loading-state"

export function SummarySkeleton() {
  return (
    <LoadingState label="Loading balances">
      <SkeletonBar width={260} height={30} anchor />
      <SkeletonRows count={1} height={14} />
    </LoadingState>
  )
}

export function AccountGroupsSkeleton({ groups = 3 }: { groups?: number }) {
  return (
    <div
      role="status"
      aria-busy
      aria-label="Loading accounts"
      className="flex flex-col gap-[22px]"
    >
      {Array.from({ length: groups }, (_, index) => (
        <div key={index}>
          <div className="mb-[11px] flex items-center gap-[10px]">
            <SkeletonBar width={110} height={9} anchor />
            <SkeletonBar height={1} />
            <SkeletonBar width={80} height={9} />
          </div>
          <Panel>
            <SkeletonRows count={3} height={58} gap={1} className="bg-border" />
          </Panel>
        </div>
      ))}
    </div>
  )
}

export function AccountPanelSkeleton({
  label,
  rows = 4,
}: {
  label: string
  rows?: number
}) {
  return (
    <LoadingState label={label}>
      <SkeletonBar width={150} height={12} anchor />
      <SkeletonRows count={rows} height={38} />
    </LoadingState>
  )
}
