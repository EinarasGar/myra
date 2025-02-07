import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { useReducer, useMemo, useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import useGetIndividualTransactions from "@/hooks/use-get-individual-transactions";
import { MemoizedDataTable } from "@/components/ui/data-table";

export type Transaction = {
  type: string;
  description: string;
  date: number;
  deltas: string;
};

export default function IndividialTransactionsPage() {
  const rerender = useReducer(() => ({}), {})[1];
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const dataQuery = useGetIndividualTransactions(
    "2396480f-0052-4cf0-81dc-8cedbde5ce13",
    pagination
  );

  console.log(dataQuery.data);

  const tableData = useMemo(() => {
    return (
      dataQuery.data?.data.map((d) => {
        return {
          type: d.type,
          description: d.description,
          date: d.date,
          deltas: "1 EUR",
        } as Transaction;
      }) ?? []
    );
  }, [dataQuery.data]);

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        header: "Name",
        footer: (props) => props.column.id,
        columns: [
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
            accessorKey: "date",
            header: () => "Date",
            footer: (props) => props.column.id,
          },
          {
            accessorKey: "deltas",
            header: () => <span>Deltas</span>,
            footer: (props) => props.column.id,
          },
        ],
      },
    ],
    []
  );

  const table = useMemo(
    () => ({
      data: tableData,
      columns,
      rowCount: dataQuery.data?.totalCount,
      pagination,
      setPagination,
    }),
    [tableData, columns, dataQuery.data?.totalCount, pagination]
  );

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
                <BreadcrumbLink href="#">Transactions</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Individual</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="m-4">
        <MemoizedDataTable {...table}></MemoizedDataTable>
      </div>
      <button onClick={() => rerender()}>Force Rerender</button>
    </>
  );
}
