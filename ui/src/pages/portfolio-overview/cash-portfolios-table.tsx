import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { MemoizedDataTable } from "@/components/ui/data-table";
import { useAccountStore } from "@/hooks/store/use-account-store";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import useGetPortfolioOverview from "@/hooks/api/use-get-portfolio-overview";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useAuthUserId } from "@/hooks/use-auth";

export type CashPortfolioRow = {
  asset_name: string;
  account_name: string;
  units: number;
  fees: number;
  dividends: number;
};

const columns: ColumnDef<CashPortfolioRow>[] = [
  {
    accessorKey: "asset_name",
    header: () => <span>Asset</span>,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "account_name",
    header: () => <span>Account</span>,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "units",
    header: () => <span>Units</span>,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "fees",
    header: () => <span>Fees</span>,
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "dividends",
    header: () => <span>Dividends</span>,
    cell: (info) => info.getValue(),
  },
];

export const CashPortfoliosTableSkeleton = () => (
  <DataTableSkeleton columns={columns} rowNum={3} usePagination={false} />
);

export default function CashPortfoliosTable() {
  const userId = useAuthUserId();
  const { data } = useGetPortfolioOverview(userId);
  const assets = useAssetStore((state) => state.assets);
  const accounts = useAccountStore((state) => state.accounts);

  const tableData = useMemo(() => {
    return (
      data.cash_portfolios.map((d) => {
        const asset = assets.find((a) => a.id === d.asset_id);
        const account = accounts.find((a) => a.id === d.account_id);
        return {
          asset_name: asset?.name ?? "",
          account_name: account?.name ?? "",
          units: d.units,
          fees: d.fees,
          dividends: d.dividends,
        } as CashPortfolioRow;
      }) ?? []
    );
  }, [accounts, assets, data.cash_portfolios]);

  const table = useMemo(
    () => ({ data: tableData, columns }),
    [tableData],
  );

  return <MemoizedDataTable {...table} />;
}
