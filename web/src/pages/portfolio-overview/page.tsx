import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/error-boundary-fallback";
import CashPortfoliosTable, {
  CashPortfoliosTableSkeleton,
} from "./cash-portfolios-table";
import AssetPortfoliosTable, {
  AssetPortfoliosTableSkeleton,
} from "./asset-portfolios-table";

export default function PortfolioOverviewPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Portfolio Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <Card className="m-4">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Cash Portfolios</CardTitle>
            <CardDescription>
              Cash positions across your accounts.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
            <Suspense fallback={<CashPortfoliosTableSkeleton />}>
              <CashPortfoliosTable />
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      </Card>

      <Card className="m-4">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Asset Portfolios</CardTitle>
            <CardDescription>
              Asset positions with gains and cost basis.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
            <Suspense fallback={<AssetPortfoliosTableSkeleton />}>
              <AssetPortfoliosTable />
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </>
  );
}
