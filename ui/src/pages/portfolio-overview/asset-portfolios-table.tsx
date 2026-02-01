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
import { useAuthUserId } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight } from "lucide-react";

export type AssetPortfolioRow = {
  asset_name: string;
  account_name: string;
  total_units: number;
  cost_basis: number;
  unrealized_gains: number;
  realized_gains: number;
  total_gains: number;
  fees: number;
  subRows?: AssetPortfolioRow[];
};

function GainCell({ value, suffix }: { value: number; suffix?: string }) {
  return (
    <span
      className={cn(
        value > 0 && "text-green-600 dark:text-green-400",
        value < 0 && "text-red-600 dark:text-red-400",
      )}
    >
      {Number(value).toFixed(2)}{suffix}
    </span>
  );
}

const columns: ColumnDef<AssetPortfolioRow>[] = [
  {
    id: "asset_name",
    accessorKey: "asset_name",
    header: () => <span>Asset</span>,
    cell: ({ row, getValue }) => (
      <div
        className="flex items-center gap-1"
        style={{ paddingLeft: `${row.depth * 1.5}rem` }}
      >
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
        <span>{getValue<string>()}</span>
      </div>
    ),
  },
  {
    accessorKey: "account_name",
    header: () => <span>Account</span>,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "total_units",
    header: () => <span>Total Units</span>,
    cell: (info) => Number(info.getValue()).toFixed(2),
  },
  {
    accessorKey: "cost_basis",
    header: () => <span>Cost Basis</span>,
    cell: (info) => Number(info.getValue()).toFixed(2),
  },
  {
    accessorKey: "unrealized_gains",
    header: () => <span>Unrealized Gains</span>,
    cell: ({ row }) => <GainCell value={row.original.unrealized_gains} />,
  },
  {
    accessorKey: "realized_gains",
    header: () => <span>Realized Gains</span>,
    cell: ({ row }) => <GainCell value={row.original.realized_gains} />,
  },
  {
    accessorKey: "total_gains",
    header: () => <span>Total Gains</span>,
    cell: ({ row }) => <GainCell value={row.original.total_gains} />,
  },
  {
    id: "gain_pct",
    header: () => <span>% Gain</span>,
    cell: ({ row }) => {
      const { total_gains, cost_basis } = row.original;
      const pct = cost_basis !== 0 ? (total_gains / cost_basis) * 100 : 0;
      return <GainCell value={pct} suffix="%" />;
    },
  },
  {
    accessorKey: "fees",
    header: () => <span>Fees</span>,
    cell: (info) => Number(info.getValue()).toFixed(2),
  },
];

export const AssetPortfoliosTableSkeleton = () => (
  <DataTableSkeleton columns={columns} rowNum={3} usePagination={false} />
);

export default function AssetPortfoliosTable() {
  const userId = useAuthUserId();
  const { data } = useGetPortfolioOverview(userId);
  const assets = useAssetStore((state) => state.assets);
  const accounts = useAccountStore((state) => state.accounts);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const tableData = useMemo(() => {
    return (
      data.asset_portfolios.map((d) => {
        const asset = assets.find((a) => a.id === d.asset_id);
        const account = accounts.find((a) => a.id === d.account_id);
        return {
          asset_name: asset?.name ?? "",
          account_name: account?.name ?? "",
          total_units: d.total_units,
          cost_basis: d.total_cost_basis,
          unrealized_gains: d.unrealized_gains,
          realized_gains: d.realized_gains,
          total_gains: d.total_gains,
          fees: d.total_fees,
          subRows: d.positions.map((p) => ({
            asset_name: p.add_date,
            account_name: p.is_dividend ? "Dividend" : "",
            total_units: p.quantity_added,
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
                className={cn(row.depth > 0 && "bg-muted/50")}
              >
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
  );
}
