import { useCallback } from "react";
import { useExpandedAssets } from "@/hooks/store/use-asset-store";
import type { ExpandedAccount } from "@/types/account";
import type { ExpandedAsset } from "@/types/assets";

export function useSuggestedCurrency() {
  const assets = useExpandedAssets();

  return useCallback(
    (account: ExpandedAccount | null): ExpandedAsset | null => {
      if (!account?.suggestedCurrencyId) return null;
      return assets.find((a) => a.id === account.suggestedCurrencyId) ?? null;
    },
    [assets],
  );
}
