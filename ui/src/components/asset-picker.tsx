import { useExpandedAssets } from "@/hooks/store/use-asset-store";
import { ComboBoxPopover } from "./combo-box-popover";
import { useMemo, useState } from "react";
import useSearchAssets from "@/hooks/api/use-get-assets";
import useDebounce from "@/hooks/use-debounce";
import { mapAssetComboBoxProps } from "@/types/assets";

export default function AssetPicker() {
  const expandedAsses = useExpandedAssets();
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const { isFetching } = useSearchAssets(debouncedSearchValue);

  const options = useMemo(() => {
    return expandedAsses.map(mapAssetComboBoxProps);
  }, [expandedAsses]);

  return (
    <div className="flex items-center space-x-4">
      <p className="text-sm text-muted-foreground">Asset</p>
      <ComboBoxPopover
        options={options}
        placeholder="Select an asset..."
        onSelect={(selectedItem) => {
          console.log("Selected:", selectedItem);
        }}
        onSearchValueChange={(searchValue) => {
          setSearchValue(searchValue);
          console.log("Search value:", searchValue);
        }}
        isFetching={isFetching}
      />
    </div>
  );
}
