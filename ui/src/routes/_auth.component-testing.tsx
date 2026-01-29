import AccountPicker from "@/components/account-picker";
import AssetAmountInput from "@/components/asset-amount-input";
import CategoryPicker from "@/components/category-picker";
import { DateTimeLanguagePicker } from "@/components/date-time-language-picker";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ExpandedAsset } from "@/types/assets";
import type { ExpandedAccount } from "@/types/account";
import type { Category } from "@/types/category";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_auth/component-testing")({
  component: RouteComponent,
});

function RouteComponent() {
  const [assetAmount, setAssetAmount] = useState<{
    asset: ExpandedAsset | null;
    amount: number | string | null;
  }>({ asset: null, amount: null });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedAccount, setSelectedAccount] =
    useState<ExpandedAccount | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const handleTestClick = () => {
    console.log("=== Component Values ===");
    console.log("Asset Amount:", {
      asset: assetAmount.asset?.ticker || "None",
      amount: assetAmount.amount || "None",
    });
    console.log("Date/Time:", selectedDate || "None");
    console.log("Account:", selectedAccount?.name || "None");
    console.log("Category:", selectedCategory?.name || "None");
    console.log("========================");
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
                <BreadcrumbLink href="#">COMPONENT TESTING</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="m-4">
        <div className="grid grid-cols-2 gap-4 max-w-4xl">
          <AssetAmountInput
            value={assetAmount}
            onAssetChange={(asset) =>
              setAssetAmount((prev) => ({ ...prev, asset }))
            }
            onAmountChange={(amount) =>
              setAssetAmount((prev) => ({ ...prev, amount }))
            }
          />
          <DateTimeLanguagePicker
            value={selectedDate}
            onChange={setSelectedDate}
          />
          <AccountPicker
            value={selectedAccount}
            onChange={setSelectedAccount}
          />
          <CategoryPicker
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
        <div className="mt-6">
          <Button onClick={handleTestClick} variant="default">
            Test - Log Values to Console
          </Button>
        </div>
      </div>
      {/* <button onClick={() => rerender()}>Force Rerender</button> */}
    </>
  );
}
