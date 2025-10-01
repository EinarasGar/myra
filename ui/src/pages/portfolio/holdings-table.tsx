import { DataTableSkeleton } from "@/components/data-table-skeleton";
import { MemoizedDataTable } from "@/components/ui/data-table";

import { useAccountStore } from "@/hooks/store/use-account-store";
import { useAssetStore } from "@/hooks/store/use-asset-store";
import useGetPortfolioHoldings from "@/hooks/api/use-get-holdings";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useAuthUserId } from "@/hooks/use-auth";
export type Holding = {
  asset_name: string;
  account_name: string;
  units: number;
  price: number;
};

const columns: ColumnDef<Holding>[] = [
  {
    accessorKey: "asset_name",
    cell: (info) => info.getValue(),
    header: () => <span>Type</span>,
    footer: (props) => props.column.id,
  },
  {
    accessorFn: (row) => row.account_name,
    id: "account_name",
    cell: (info) => info.getValue(),
    header: () => <span>Account Name</span>,
    footer: (props) => props.column.id,
  },
  {
    accessorKey: "units",
    header: () => "Units",
    cell: (info) => info.getValue(),
    footer: (props) => props.column.id,
  },
  {
    accessorKey: "price",
    header: () => <span>Price</span>,
    footer: (props) => props.column.id,
  },
];

export const HoldingsTableSkeleton = () => (
  <DataTableSkeleton
    columns={columns}
    rowNum={3}
    usePagination={false}
  ></DataTableSkeleton>
);

export default function HoldingsTable() {
  const userId = useAuthUserId();
  const { data: holdingData } = useGetPortfolioHoldings(userId);
  const assets = useAssetStore((state) => state.assets);
  const accounts = useAccountStore((state) => state.accounts);

  const tableData = useMemo(() => {
    return (
      holdingData.map((d) => {
        const asset = assets.find((a) => a.id === d.asset_id);
        const account = accounts.find((a) => a.id === d.account_id);

        return {
          asset_name: asset?.name,
          account_name: account?.name,
          units: d.units,
          price: d.value,
        } as Holding;
      }) ?? []
    );
  }, [accounts, assets, holdingData]);

  const table = useMemo(
    () => ({
      data: tableData,
      columns,
    }),
    [tableData],
  );

  return <MemoizedDataTable {...table}></MemoizedDataTable>;
}
