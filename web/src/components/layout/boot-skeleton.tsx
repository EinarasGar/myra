import { SkeletonBar } from "@/components/states/loading-state"

import { PageContainer } from "./page-container"

export function AppBootSkeleton() {
  return (
    <div
      role="status"
      aria-busy
      className="flex min-h-svh bg-background"
      data-slot="boot-skeleton"
    >
      <span className="sr-only">Loading Sverto</span>
      <div className="hidden w-[58px] flex-none flex-col items-center gap-1.5 border-r border-border py-4 lg:flex">
        <SkeletonBar width={23} height={23} anchor className="mb-3.5" />
        {[0, 1, 2, 3].map((index) => (
          <SkeletonBar key={index} width={34} height={34} />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-[60px] flex-none" />
        <PageContainer>
          <div className="flex flex-col gap-[11px] pt-2 pb-[18px]">
            <SkeletonBar width={70} height={9} />
            <SkeletonBar width={210} height={22} anchor />
          </div>
          <SkeletonBar width="100%" height={220} />
        </PageContainer>
      </div>
    </div>
  )
}
