import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { useAccountStore } from "@/hooks/use-account-store";
import { useAssetStore } from "@/hooks/use-asset-store";
import useGetPortfolioHoldings from "@/hooks/use-get-holdings";

export default function Holdings() {
  const { data: holdingData } = useGetPortfolioHoldings(
    "2396480f-0052-4cf0-81dc-8cedbde5ce13"
  );
  const assets = useAssetStore((state) => state.assets);
  const accounts = useAccountStore((state) => state.accounts);

  console.log(holdingData);
  console.log("assets", assets);
  console.log("accounts", accounts);

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
              {holdingData?.map((holding) => {
                const asset = assets.find((a) => a.id === holding.asset_id);
                const account = accounts.find(
                  (a) => a.id === holding.account_id
                );

                return (
                  <TableRow key={holding.account_id + holding.asset_id}>
                    <TableCell className="font-medium">{asset?.name}</TableCell>
                    <TableCell>{account?.name}</TableCell>
                    <TableCell>{holding.units}</TableCell>
                    <TableCell className="text-right">
                      {holding.value}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
