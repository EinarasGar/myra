import { useMemo, useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { useAuthUserId } from "@/hooks/use-auth";
import useGetAccountTransactions from "@/hooks/api/use-get-account-transactions";
import { MemoizedDataTable } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import useTransactionViewModelConverter, { Transaction } from "@/hooks/use-transaction-converter";

interface AccountTransactionsProps {
  accountId: string;
}

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "type",
    cell: (info) => info.getValue(),
    header: () => <span>Type</span>,
    footer: (props) => props.column.id,
  },
  {
    accessorFn: (row) => row.description,
    id: "description",
    cell: (info) => info.getValue(),
    header: () => <span>Description</span>,
    footer: (props) => props.column.id,
  },
  {
    accessorFn: (row) => row.date,
    id: "date",
    header: () => "Date",
    cell: (info) => {
      const date = new Date((info.getValue() as number) * 1000);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    },
    footer: (props) => props.column.id,
  },
  {
    accessorKey: "deltas",
    header: () => <span>Deltas</span>,
    footer: (props) => props.column.id,
  },
];

export const AccountTransactionsSkeleton = () => (
  <DataTableSkeleton columns={columns} rowNum={3} usePagination={true} />
);

export default function AccountTransactions({
  accountId,
}: AccountTransactionsProps) {
  const userId = useAuthUserId();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const dataQuery = useGetAccountTransactions(userId, accountId, pagination);
  const tableData = useTransactionViewModelConverter(dataQuery.data.data);

  const table = useMemo(
    () => ({
      data: tableData,
      columns,
      rowCount: dataQuery.data?.totalCount,
      pagination,
      setPagination,
    }),
    [tableData, dataQuery.data?.totalCount, pagination],
  );

  return <MemoizedDataTable {...table} />;
}
