import { Panel } from "@/components/primitives"
import { LoadingState, SkeletonBar } from "@/components/states/loading-state"

function Rows({ count, height }: { count: number; height: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-border px-4 py-[14px] last:border-b-0"
        >
          <SkeletonBar width={34} height={height} />
          <SkeletonBar width="45%" height={height} />
          <span className="flex-1" />
          <SkeletonBar width={64} height={height} />
        </div>
      ))}
    </>
  )
}

export function PickerRowsSkeleton({ panel = false }: { panel?: boolean }) {
  const rows = <Rows count={5} height={10} />
  if (!panel) return rows
  return (
    <Panel aria-busy role="status">
      <span className="sr-only">Loading currencies</span>
      {rows}
    </Panel>
  )
}

export function SettingsListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Panel aria-busy role="status">
      <span className="sr-only">Loading</span>
      <Rows count={rows} height={11} />
    </Panel>
  )
}

export function SettingsQuotaSkeleton() {
  return (
    <LoadingState label="Loading Myra usage">
      <SkeletonBar width={120} height={12} anchor />
      <SkeletonBar width="100%" height={6} />
      <SkeletonBar width="100%" height={6} />
    </LoadingState>
  )
}

export function SettingsCardsSkeleton() {
  return (
    <div className="grid gap-[14px] md:grid-cols-2">
      {Array.from({ length: 2 }, (_, index) => (
        <Panel key={index} className="flex flex-col gap-3 p-[18px]">
          <SkeletonBar width={140} height={14} anchor />
          <SkeletonBar width="100%" height={10} />
          <SkeletonBar width="80%" height={10} />
        </Panel>
      ))}
    </div>
  )
}

export function SettingsGroupsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, index) => (
        <Panel key={index} className="flex flex-col gap-3 p-4">
          <SkeletonBar width={160} height={12} anchor />
          <SkeletonBar width="100%" height={28} />
        </Panel>
      ))}
    </div>
  )
}
