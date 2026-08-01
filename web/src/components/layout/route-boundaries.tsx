import { Suspense, type ReactNode } from "react"
import { QueryErrorResetBoundary } from "@tanstack/react-query"
import { Link, type ErrorComponentProps } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/states/empty-state"
import {
  LoadingState,
  SkeletonBar,
  SkeletonRows,
} from "@/components/states/loading-state"

import { ErrorBoundary } from "./error-boundary"
import { ErrorStateFor } from "./error-states"
import { PageContainer } from "./page-container"

function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-[11px] pt-2 pb-[18px]">
      <SkeletonBar width={70} height={9} />
      <SkeletonBar width={210} height={22} anchor />
    </div>
  )
}

export function RoutePending({ label = "Loading" }: { label?: string }) {
  return (
    <div data-slot="route-pending">
      <PageHeaderSkeleton />
      <LoadingState label={label}>
        <SkeletonBar width={260} height={34} anchor />
        <SkeletonBar width="100%" height={130} />
        <SkeletonRows count={5} height={38} />
      </LoadingState>
    </div>
  )
}

export function RouteErrorPanel({ error, reset }: ErrorComponentProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset: resetQueries }) => (
        <div data-slot="route-error">
          <PageHeaderSkeleton />
          <ErrorStateFor
            error={error}
            onRetry={() => {
              resetQueries()
              reset()
            }}
          />
        </div>
      )}
    </QueryErrorResetBoundary>
  )
}

export function RootErrorPanel(props: ErrorComponentProps) {
  return (
    <PageContainer className="pt-10">
      <RouteErrorPanel {...props} />
    </PageContainer>
  )
}

export function RootPending() {
  return (
    <PageContainer className="pt-10">
      <RoutePending />
    </PageContainer>
  )
}

export function RouteNotFound() {
  return (
    <PageContainer data-slot="route-not-found">
      <EmptyState
        size="page"
        headline="That page doesn't exist"
        body="The address you followed isn't part of Sverto. Nothing is broken — the link is."
        actions={[]}
        footnote={
          <Link to="/" className="font-semibold text-brand">
            Back to the dashboard →
          </Link>
        }
      />
    </PageContainer>
  )
}

export function PanelBoundary({
  children,
  pending,
  className,
}: {
  children: ReactNode
  pending?: ReactNode
  className?: string
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallback={(error, retry) => (
            <ErrorStateFor
              error={error}
              onRetry={retry}
              className={className}
            />
          )}
        >
          <Suspense
            fallback={
              pending ?? (
                <LoadingState className={cn(className)}>
                  <SkeletonRows count={4} height={38} />
                </LoadingState>
              )
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
