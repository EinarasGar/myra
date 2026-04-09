import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/error-boundary-fallback";
import { useGetUserAccounts } from "@/hooks/api/use-user-account-api";
import { useUserId } from "@/hooks/use-auth";
import { useParams } from "@tanstack/react-router";
import { LineChartSkeleton } from "@/components/line-chart-skeleton";

import AccountNotFound from "./account-not-found";
import AccountNetWorthChart from "./account-net-worth-chart";
import InvestmentSummaryCard from "./investment-summary-card";
import AccountHoldings from "./account-holdings";
import AccountTransactions, {
  AccountTransactionsSkeleton,
} from "./account-transactions";

export default function AccountDetailPage() {
  const { accountId } = useParams({ from: "/_auth/accounts/$accountId" });
  const userId = useUserId();
  const { data: accounts } = useGetUserAccounts(userId);
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    return <AccountNotFound />;
  }

  const isCurrentAccount =
    account.accountType?.name?.toLowerCase() === "current";

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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/settings/accounts">
                  Accounts
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2">
                  {account.name}
                  {account.accountType && (
                    <Badge variant="outline">{account.accountType.name}</Badge>
                  )}
                  {account.ownershipShare < 1 && (
                    <Badge variant="secondary">
                      {Math.round(account.ownershipShare * 100)}%
                    </Badge>
                  )}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Chart section */}
      <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
        <Suspense fallback={<LineChartSkeleton />}>
          <AccountNetWorthChart accountId={accountId} />
        </Suspense>
      </ErrorBoundary>

      {!isCurrentAccount && (
        <>
          {/* Investment Summary section */}
          <div className="m-4">
            <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
              <Suspense
                fallback={
                  <div className="h-24 animate-pulse rounded-lg bg-muted" />
                }
              >
                <InvestmentSummaryCard accountId={accountId} />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Holdings section */}
          <Card className="m-4">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
              <div className="grid flex-1 gap-1 text-center sm:text-left">
                <CardTitle>Holdings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
                <Suspense
                  fallback={
                    <div className="h-48 animate-pulse rounded-lg bg-muted" />
                  }
                >
                  <AccountHoldings accountId={accountId} />
                </Suspense>
              </ErrorBoundary>
            </CardContent>
          </Card>
        </>
      )}

      {/* Transactions section */}
      <Card className="m-4">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Transactions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
            <Suspense fallback={<AccountTransactionsSkeleton />}>
              <AccountTransactions accountId={accountId} />
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </>
  );
}
