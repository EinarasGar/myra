import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import HoldingsTable, { HoldingsTableSkeleton } from "./holdings-table";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "@/components/error-boundary-fallback";

export function HoldingsFallback() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px]">Asset name</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Units</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Loading...</TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell className="text-right"></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default function Holdings() {
  return (
    <>
      <Card className="m-4">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Holdings</CardTitle>
            <CardDescription>
              The list of all asset holdings you have.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
            <Suspense fallback={<HoldingsTableSkeleton />}>
              <HoldingsTable />
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </>
  );
}
