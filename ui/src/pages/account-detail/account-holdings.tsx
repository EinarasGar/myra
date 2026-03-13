import { useMemo } from "react";
import { useUserId } from "@/hooks/use-auth";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import useGetAccountPortfolioOverview from "@/hooks/api/use-get-account-portfolio-overview";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface AccountHoldingsProps {
  accountId: string;
}

type AssetHoldingRow = {
  asset_name: string;
  total_units: number;
  cost_basis: number;
  unrealized_gains: number;
  total_gains: number;
  fees: number;
};

type CashHoldingRow = {
  asset_name: string;
  units: number;
  fees: number;
  dividends: number;
};

function GainCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        value > 0 && "text-green-600 dark:text-green-400",
        value < 0 && "text-red-600 dark:text-red-400",
      )}
    >
      {Number(value).toFixed(2)}
    </span>
  );
}

const assetColumns: ColumnDef<AssetHoldingRow>[] = [
  {
    accessorKey: "asset_name",
    header: () => <span>Asset</span>,
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
    accessorKey: "total_gains",
    header: () => <span>Total Gains</span>,
    cell: ({ row }) => <GainCell value={row.original.total_gains} />,
  },
  {
    accessorKey: "fees",
    header: () => <span>Fees</span>,
    cell: (info) => Number(info.getValue()).toFixed(2),
  },
];

const cashColumns: ColumnDef<CashHoldingRow>[] = [
  {
    accessorKey: "asset_name",
    header: () => <span>Asset</span>,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "units",
    header: () => <span>Units</span>,
    cell: (info) => Number(info.getValue()).toFixed(2),
  },
  {
    accessorKey: "fees",
    header: () => <span>Fees</span>,
    cell: (info) => Number(info.getValue()).toFixed(2),
  },
  {
    accessorKey: "dividends",
    header: () => <span>Dividends</span>,
    cell: (info) => Number(info.getValue()).toFixed(2),
  },
];

function SimpleTable<TData>({
  data,
  columns,
  emptyMessage,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  emptyMessage: string;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
              <TableRow key={row.id}>
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
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AccountHoldings({ accountId }: AccountHoldingsProps) {
  const userId = useUserId();
  const { data } = useGetAccountPortfolioOverview(userId, accountId);
  const assets = useAssetStore((state) => state.assets);

  const assetRows = useMemo<AssetHoldingRow[]>(() => {
    return (data.asset_portfolios ?? []).map((p) => {
      const asset = assets.find((a) => a.id === p.asset_id);
      return {
        asset_name: asset?.name ?? String(p.asset_id),
        total_units: p.total_units,
        cost_basis: p.total_cost_basis,
        unrealized_gains: p.unrealized_gains,
        total_gains: p.total_gains,
        fees: p.total_fees,
      };
    });
  }, [data.asset_portfolios, assets]);

  const cashRows = useMemo<CashHoldingRow[]>(() => {
    return (data.cash_portfolios ?? []).map((p) => {
      const asset = assets.find((a) => a.id === p.asset_id);
      return {
        asset_name: asset?.name ?? String(p.asset_id),
        units: p.units,
        fees: p.fees,
        dividends: p.dividends,
      };
    });
  }, [data.cash_portfolios, assets]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Asset Holdings
        </h3>
        <SimpleTable
          data={assetRows}
          columns={assetColumns}
          emptyMessage="No asset holdings"
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Cash Holdings
        </h3>
        <SimpleTable
          data={cashRows}
          columns={cashColumns}
          emptyMessage="No cash holdings"
        />
      </div>
    </div>
  );
}
