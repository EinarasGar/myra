import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AssetsApiFactory, AuthMe } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { useSetBaseAsset } from "@/hooks/api/use-set-base-asset";
import { useUserId, useDefaultAssetId } from "@/hooks/use-auth";
import { SelectCombobox } from "@/components/select-combobox";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CurrencyOption extends ComboBoxElement {
  id: number;
  name: string;
  ticker: string;
  getKey: () => string;
  getLabel: () => string;
  getKeyWords: () => string[];
}

export default function BaseCurrencyPage() {
  const userId = useUserId();
  const defaultAssetId = useDefaultAssetId();
  const queryClient = useQueryClient();
  const setBaseAsset = useSetBaseAsset(userId);

  const [userSelected, setUserSelected] = useState<CurrencyOption | null>(null);

  const { data: currencies = [], isFetching } = useQuery({
    queryKey: [QueryKeys.ASSETS, "currencies"],
    queryFn: async (): Promise<CurrencyOption[]> => {
      const data = await AssetsApiFactory().searchAssets(500, 0, undefined, 1);
      return data.data.results.map((asset) => ({
        id: asset.asset_id,
        name: asset.name,
        ticker: asset.ticker,
        getKey: () => String(asset.asset_id),
        getLabel: () => `${asset.ticker} - ${asset.name}`,
        getKeyWords: () => [asset.ticker, asset.name],
      }));
    },
  });

  const selectedCurrency =
    userSelected ?? currencies.find((c) => c.id === defaultAssetId) ?? null;

  const handleSelect = async (item: CurrencyOption | null) => {
    if (!item) return;
    setUserSelected(item);
    await setBaseAsset.mutateAsync({ asset_id: item.id });
    queryClient.setQueryData<AuthMe>([QueryKeys.AUTH_ME], (old) =>
      old ? { ...old, default_asset_id: item.id } : old,
    );
  };

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
                <BreadcrumbLink href="#">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Base Currency</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Base Currency</CardTitle>
            <CardDescription>
              All your balances and net worth are converted into this currency
              for reporting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SelectCombobox
              options={currencies}
              placeholder="Search currencies..."
              onSelect={(item) => handleSelect(item as CurrencyOption | null)}
              isFetching={isFetching}
              value={selectedCurrency}
              aria-label="Base currency"
            />
            {setBaseAsset.isPending && (
              <Button variant="outline" disabled className="w-full">
                Saving...
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
