import { useExpandedAssets } from "@/hooks/store/use-asset-store";
import { SelectCombobox } from "@/components/select-combobox";
import { useMemo, useState } from "react";
import useSearchAssets from "@/hooks/api/use-get-assets";
import useDebounce from "@/hooks/use-debounce";
import { mapAssetComboBoxProps, type ExpandedAsset } from "@/types/assets";
import type { ComboBoxElement } from "@/interfaces/combo-box-element";

interface AssetPickerProps {
  value?: ExpandedAsset | null;
  onChange?: (asset: ExpandedAsset | null) => void;
  placeholder?: string;
  showLabel?: boolean;
  assetDisplay?: "full" | "ticker";
  disabled?: boolean;
  error?: string;
  required?: boolean;
  className?: string;
}

export default function AssetPicker({
  value,
  onChange,
  placeholder = "Select an asset...",
  showLabel = true,
  assetDisplay = "full",
  disabled,
  error,
  required,
  className,
}: AssetPickerProps = {}) {
  const expandedAssets = useExpandedAssets();
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ExpandedAsset | null>(
    value ?? null,
  );
  const debouncedSearchValue = useDebounce(searchValue, 500);
  const { isFetching } = useSearchAssets(debouncedSearchValue);

  const currentValue = value ?? selectedAsset;

  const options = useMemo(() => {
    return expandedAssets.map((asset) => ({
      ...mapAssetComboBoxProps(asset),
      getLabel: () => `${asset.ticker} • ${asset.name}`,
    }));
  }, [expandedAssets]);

  const handleSelect = (asset: (ExpandedAsset & ComboBoxElement) | null) => {
    if (!value) {
      setSelectedAsset(asset);
    }
    onChange?.(asset);
  };

  const currentValueWithDisplay = useMemo(() => {
    if (!currentValue) return null;
    return {
      ...mapAssetComboBoxProps(currentValue),
      getLabel: () =>
        assetDisplay === "ticker" ? currentValue.ticker : currentValue.name,
    };
  }, [currentValue, assetDisplay]);

  return (
    <div className={showLabel ? "flex items-center space-x-4" : ""}>
      {showLabel && <p className="text-sm text-muted-foreground">Asset</p>}
      <SelectCombobox
        options={options}
        placeholder={placeholder}
        value={currentValueWithDisplay}
        onSelect={handleSelect}
        onSearchValueChange={(searchValue) => {
          setSearchValue(searchValue);
        }}
        isFetching={isFetching}
        disabled={disabled}
        error={error}
        required={required}
        className={className}
      />
    </div>
  );
}
