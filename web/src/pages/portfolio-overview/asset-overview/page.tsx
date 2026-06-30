import { useMemo, useState } from "react";
import { Suspense } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/error-boundary-fallback";
import { LineChartSkeleton } from "@/components/line-chart-skeleton";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  useUserId,
  useDefaultAssetId,
  useDefaultAssetTicker,
} from "@/hooks/use-auth";
import useGetAsset from "@/hooks/api/use-get-asset";
import useGetPortfolioAssetOverview from "@/hooks/api/use-get-portfolio-asset-overview";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import { useAccountStore } from "@/hooks/store/use-account-store";
import AssetPairInfo from "@/pages/global-assets/detail/asset-pair-info";
import GlobalAssetRateChart from "@/pages/global-assets/detail/asset-rate-chart";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";

export type AssetOverviewRow = {
  account_name: string;
  units_held: number;
  units_bought?: number;
  buy_date: string;
  buy_price: number;
  cost_basis: number;
  unrealized_gains: number;
  realized_gains: number;
  total_gains: number;
  fees: number;
};

function GainCell({
  value,
  baseTicker,
  suffix,
}: {
  value: number;
  baseTicker: string;
  suffix?: string;
}) {
  return (
    <span
      className={cn(
        value > 0 && "text-green-600 dark:text-green-400",
        value < 0 && "text-red-600 dark:text-red-400",
      )}
    >
      {suffix
        ? `${Number(value).toFixed(2)}${suffix}`
        : formatMoney(Number(value), baseTicker, true)}
    </span>
  );
}

function makeColumns(baseTicker: string): ColumnDef<AssetOverviewRow>[] {
  return [
    {
      accessorKey: "account_name",
      header: () => <span>Account</span>,
    },
    {
      accessorKey: "units_held",
      header: () => <span>Units Held</span>,
      cell: ({ row }) => {
        const { units_held, units_bought } = row.original;
        return units_bought !== undefined
          ? `${Number(units_held)} of ${Number(units_bought)}`
          : Number(units_held).toFixed(2);
      },
    },
    {
      accessorKey: "buy_date",
      header: () => <span>Buy Date</span>,
    },
    {
      accessorKey: "buy_price",
      header: () => <span>Buy Price</span>,
      cell: ({ row }) => formatMoney(row.original.buy_price, baseTicker),
    },
    {
      accessorKey: "cost_basis",
      header: () => <span>Cost Basis</span>,
      cell: ({ row }) =>
        formatMoney(Number(row.original.cost_basis), baseTicker),
    },
    {
      accessorKey: "unrealized_gains",
      header: () => <span>Unrealized Gains</span>,
      cell: ({ row }) => (
        <GainCell
          value={row.original.unrealized_gains}
          baseTicker={baseTicker}
        />
      ),
    },
    {
      accessorKey: "realized_gains",
      header: () => <span>Realized Gains</span>,
      cell: ({ row }) => (
        <GainCell value={row.original.realized_gains} baseTicker={baseTicker} />
      ),
    },
    {
      accessorKey: "total_gains",
      header: () => <span>Total Gains</span>,
      cell: ({ row }) => (
        <GainCell value={row.original.total_gains} baseTicker={baseTicker} />
      ),
    },
    {
      id: "gain_pct",
      header: () => <span>% Gain</span>,
      cell: ({ row }) => {
        const { total_gains, cost_basis } = row.original;
        const pct = cost_basis !== 0 ? (total_gains / cost_basis) * 100 : 0;
        return <GainCell value={pct} baseTicker={baseTicker} suffix="%" />;
      },
    },
    {
      accessorKey: "fees",
      header: () => <span>Fees</span>,
      cell: ({ row }) => formatMoney(Number(row.original.fees), baseTicker),
    },
  ];
}

interface Props {
  assetId: number;
}

export default function PortfolioAssetOverviewPage({ assetId }: Props) {
  const userId = useUserId();
  const defaultAssetId = useDefaultAssetId();
  const baseTicker = useDefaultAssetTicker() ?? "";

  const assets = useAssetStore((state) => state.assets);
  const accounts = useAccountStore((state) => state.accounts);

  const { data: assetData } = useGetAsset(assetId);
  const pairOptions = assetData?.data?.pairs ?? [];

  const [selectedPairId, setSelectedPairId] = useState<number>(() => {
    if (
      defaultAssetId != null &&
      pairOptions.some((p) => p.asset_id === defaultAssetId)
    ) {
      return defaultAssetId;
    }
    return pairOptions[0]?.asset_id ?? 0;
  });

  const { data } = useGetPortfolioAssetOverview(
    userId,
    assetId,
    selectedPairId || null,
  );

  const assetPortfolios = data?.asset_portfolios ?? [];

  // Build ticker/name for the header
  const assetObj = assets.find((a) => a.id === assetId);
  const assetTicker = assetObj?.ticker ?? "";
  const assetName = assetObj?.name ?? "";

  // Header summary: sum across all asset_portfolios
  const summary = useMemo(() => {
    let value = 0;
    let costBasis = 0;
    let unrealizedGains = 0;
    let units = 0;
    for (const ap of assetPortfolios) {
      value += ap.market_value;
      costBasis += ap.total_cost_basis;
      unrealizedGains += ap.unrealized_gains;
      units += ap.remaining_units;
    }
    return { value, costBasis, unrealizedGains, units };
  }, [assetPortfolios]);

  // Flatten all positions across all asset_portfolios, sorted by buy_date asc (FIFO)
  const tableData: AssetOverviewRow[] = useMemo(() => {
    const rows: AssetOverviewRow[] = assetPortfolios.flatMap((ap) => {
      const account = accounts.find((a) => a.id === ap.account_id);
      const accountName = account?.name ?? "";
      return (ap.positions ?? []).map((p) => ({
        account_name: accountName,
        units_held: p.amount_left,
        units_bought: p.quantity_added,
        buy_date: p.add_date,
        buy_price: p.add_price,
        cost_basis: p.total_cost_basis,
        unrealized_gains: p.unrealized_gains,
        realized_gains: p.realized_gains,
        total_gains: p.total_gains,
        fees: p.fees,
      }));
    });
    rows.sort(
      (a, b) => new Date(a.buy_date).getTime() - new Date(b.buy_date).getTime(),
    );
    return rows;
  }, [assetPortfolios, accounts]);

  const columns = useMemo(() => makeColumns(baseTicker), [baseTicker]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
                <BreadcrumbPage>
                  {assetTicker} · {assetName}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Header summary */}
        <Card>
          <CardHeader className="border-b py-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  {assetName}
                </CardTitle>
                <p className="text-muted-foreground">{assetTicker}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="text-lg font-medium">
                  {formatMoney(summary.value, baseTicker)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost Basis</p>
                <p className="text-lg font-medium">
                  {formatMoney(summary.costBasis, baseTicker)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                <p
                  className={cn(
                    "text-lg font-medium",
                    summary.unrealizedGains > 0 &&
                      "text-green-600 dark:text-green-400",
                    summary.unrealizedGains < 0 &&
                      "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatMoney(summary.unrealizedGains, baseTicker, true)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Units Held</p>
                <p className="text-lg font-medium">
                  {Number(summary.units).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pair selector + chart */}
        {pairOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={String(selectedPairId)}
              onValueChange={(v) => setSelectedPairId(Number(v))}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select pair" />
              </SelectTrigger>
              <SelectContent>
                {pairOptions.map((pair) => (
                  <SelectItem key={pair.asset_id} value={String(pair.asset_id)}>
                    {pair.ticker} — {pair.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedPairId > 0 && (
          <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
            <GlobalAssetRateChart
              assetId={assetId}
              referenceId={selectedPairId}
              range="1y"
            />
          </ErrorBoundary>
        )}

        {selectedPairId > 0 && (
          <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
            <Suspense fallback={<LineChartSkeleton />}>
              <AssetPairInfo assetId={assetId} referenceId={selectedPairId} />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Positions table */}
        <Card>
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1 text-center sm:text-left">
              <CardTitle>Positions</CardTitle>
              <CardTitle className="text-lg">
                {tableData.length} lot{tableData.length !== 1 ? "s" : ""}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
              <Suspense
                fallback={
                  <DataTableSkeleton
                    columns={makeColumns(baseTicker)}
                    rowNum={3}
                    usePagination={false}
                  />
                }
              >
                {tableData.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext(),
                                    )}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length}
                              className="h-24 text-center"
                            >
                              No results.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    No positions held for this asset.
                  </p>
                )}
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
