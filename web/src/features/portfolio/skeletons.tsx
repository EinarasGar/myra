import {
  LoadingState,
  SkeletonBar,
  SkeletonRows,
} from "@/components/states/loading-state"

export function PortfolioBodySkeleton() {
  return (
    <LoadingState label="Loading holdings">
      <SkeletonBar width={220} height={12} anchor />
      <SkeletonBar width="100%" height={10} />
      <SkeletonRows count={6} height={44} />
    </LoadingState>
  )
}
