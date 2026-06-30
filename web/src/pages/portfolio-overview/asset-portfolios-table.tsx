import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { useAccountStore } from "@/hooks/store/use-account-store";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import useGetPortfolioOverview from "@/hooks/api/use-get-portfolio-overview";
import {
  ColumnDef,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useUserId, useDefaultAssetTicker } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type AssetPortfolioRow = {
  asset_id: number;
  asset_name: string;
  account_name: string;
  units_held: number;
  units_bought?: number; // present on lot sub-rows only
  is_closed?: boolean;
  cost_basis: number;
  unrealized_gains: number;
  realized_gains: number;
  total_gains: number;
  fees: number;
  subRows?: AssetPortfolioRow[];
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

function makeColumns(baseTicker: string): ColumnDef<AssetPortfolioRow>[] {
  return [
    {
      id: "asset_name",
      accessorKey: "asset_name",
      header: () => <span>Asset</span>,
      cell: ({ row, getValue }) => {
        const assetName = getValue<string>();
        const content = (
          <span>
            {row.getCanExpand() ? (
              <button
                onClick={row.getToggleExpandedHandler()}
                className="cursor-pointer p-0.5"
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    row.getIsExpanded() && "rotate-90",
                  )}
                />
              </button>
            ) : null}
            {assetName}
          </span>
        );
        return (
          <div
            className="flex items-center gap-1"
            style={{ paddingLeft: `${row.depth * 1.5}rem` }}
          >
            {row.depth === 0 ? (
              <Link
                to="/portfolio-overview/$assetId"
                params={{ assetId: String(row.original.asset_id) }}
                className="text-blue-600 hover:underline"
              >
                {content}
              </Link>
            ) : (
              content
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "account_name",
      header: () => <span>Account</span>,
      cell: (info) => info.getValue(),
    },
    {
      id: "units_held",
      header: () => <span>Units Held</span>,
      cell: ({ row }) => {
        const { units_held, units_bought } = row.original;
        return units_bought === undefined
          ? Number(units_held).toFixed(2)
          : `${Number(units_held)} of ${Number(units_bought)}`;
      },
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

export const AssetPortfoliosTableSkeleton = () => (
  <DataTableSkeleton
    columns={makeColumns("")}
    rowNum={3}
    usePagination={false}
  />
);

export default function AssetPortfoliosTable() {
  const userId = useUserId();
  const baseTicker = useDefaultAssetTicker() ?? "";
  const { data } = useGetPortfolioOverview(userId);
  const assets = useAssetStore((state) => state.assets);
  const accounts = useAccountStore((state) => state.accounts);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const columns = useMemo(() => makeColumns(baseTicker), [baseTicker]);

  const tableData = useMemo(() => {
    return (
      data.asset_portfolios.map((d) => {
        const asset = assets.find((a) => a.id === d.asset_id);
        const account = accounts.find((a) => a.id === d.account_id);
        return {
          asset_id: d.asset_id,
          account_name: account?.name ?? "",
          asset_name: asset?.name ?? "",
          units_held: d.remaining_units,
          cost_basis: d.total_cost_basis,
          unrealized_gains: d.unrealized_gains,
          realized_gains: d.realized_gains,
          total_gains: d.total_gains,
          fees: d.total_fees,
          subRows: [...d.positions]
            .sort(
              (a, b) =>
                new Date(b.add_date).getTime() - new Date(a.add_date).getTime(),
            )
            .map((p) => ({
              asset_name:
                p.amount_left === 0 ? `${p.add_date} (closed)` : p.add_date,
              account_name: p.is_dividend ? "Dividend" : "",
              units_held: p.amount_left,
              units_bought: p.quantity_added,
              is_closed: p.amount_left === 0,
              cost_basis: p.total_cost_basis,
              unrealized_gains: p.unrealized_gains,
              realized_gains: p.realized_gains,
              total_gains: p.total_gains,
              fees: p.fees,
            })),
        } as AssetPortfolioRow;
      }) ?? []
    );
  }, [accounts, assets, data.asset_portfolios]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
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
              <TableRow
                key={row.id}
                className={cn(
                  row.depth > 0 && "bg-muted/50",
                  row.original.is_closed && "opacity-60",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
