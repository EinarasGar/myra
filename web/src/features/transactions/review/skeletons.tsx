import { Panel } from "@/components/primitives"
import { SkeletonBar, SkeletonRows } from "@/components/states/loading-state"

export function ReviewSkeleton() {
  return (
    <div data-slot="review-skeleton" role="status" aria-busy>
      <span className="sr-only">Loading the review queue</span>
      <div className="mb-[13px] flex items-center gap-3">
        <SkeletonBar width={110} height={11} />
        <SkeletonBar height={3} />
        <SkeletonBar width={96} height={11} />
      </div>

      <Panel className="border-border-strong">
        <div className="flex flex-col lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4 px-5 pt-5 pb-[18px] lg:px-[22px]">
            <SkeletonBar width={210} height={20} />
            <SkeletonBar width={280} height={26} anchor />
            <SkeletonBar width="100%" height={62} />
            <SkeletonBar width="70%" height={26} />
            <SkeletonBar width="100%" height={44} />
          </div>
          <div className="flex flex-none flex-col gap-3 border-t border-border bg-surface-2 px-[18px] pt-[18px] pb-4 lg:w-[296px] lg:border-t-0 lg:border-l">
            <SkeletonBar width={130} height={9} />
            <SkeletonRows count={3} height={34} />
          </div>
        </div>
        <div className="flex gap-2 border-t border-border bg-surface-2 px-5 py-[13px] lg:px-[22px]">
          <SkeletonBar width={104} height={30} />
          <SkeletonBar width={112} height={30} />
          <SkeletonBar width={74} height={30} />
        </div>
      </Panel>

      <div className="pt-[22px] pb-[10px]">
        <SkeletonBar width={70} height={9} />
      </div>
      <Panel>
        <div className="p-[18px]">
          <SkeletonRows count={4} height={30} />
        </div>
      </Panel>
    </div>
  )
}
