import { useReducer, useMemo, useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import useGetIndividualTransactions from "@/hooks/api/use-get-individual-transactions";
import { MemoizedDataTable } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/data-table-skeleton";
import useTransactionViewModelConverter from "../../hooks/use-transaction-converter";

export type Transaction = {
  type: string;
  description: string;
  date: number;
  deltas: string;
};
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
      const date = new Date(info.getValue() * 1000);
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

export const IndividialTransactionsTableSkeleton = () => (
  <DataTableSkeleton
    columns={columns}
    rowNum={3}
    usePagination={true}
  ></DataTableSkeleton>
);

export default function IndividialTransactionsTable() {
  const rerender = useReducer(() => ({}), {})[1];
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const dataQuery = useGetIndividualTransactions(
    "2396480f-0052-4cf0-81dc-8cedbde5ce13",
    pagination
  );

  const tableData = useTransactionViewModelConverter(dataQuery.data.data);

  const table = useMemo(
    () => ({
      data: tableData,
      columns,
      rowCount: dataQuery.data?.totalCount,
      pagination,
      setPagination,
    }),
    [tableData, dataQuery.data?.totalCount, pagination]
  );

  return (
    <>
      <div className="m-4">
        <MemoizedDataTable {...table}></MemoizedDataTable>
      </div>
      <button onClick={() => rerender()}>Force Rerender</button>
    </>
  );
}
