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
import { useMemo } from "react";
import { DataTablePagination } from "./ui/data-table-pagination";
import { Skeleton } from "./ui/skeleton";

interface DataTableSkeletonProps<TData> {
  columns: ColumnDef<TData>[];
  rowNum: number;
  usePagination: boolean;
}

export function DataTableSkeleton<TData>({
  columns,
  rowNum,
  usePagination,
}: DataTableSkeletonProps<TData>) {
  const data = useMemo(() => {
    return [];
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    debugTable: true,
  });

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowNum }).map((_, index) => (
              <TableRow key={index}>
                {table.getAllColumns().map((column) => (
                  <>
                    <TableCell key={column.id} className="h-12">
                      <Skeleton className="h-4 w-[250px]" />{" "}
                    </TableCell>
                  </>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {usePagination && <DataTablePagination table={table} />}
    </div>
  );
}
