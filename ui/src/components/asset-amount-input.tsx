import { useState } from "react";
import { type ExpandedAsset } from "@/types/assets";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import AssetPicker from "./asset-picker";

interface AssetAmountInputProps {
  value?: {
    asset: ExpandedAsset | null;
    amount: number | string | null;
  };
  onAssetChange?: (asset: ExpandedAsset | null) => void;
  onAmountChange?: (amount: number | string | null) => void;
  assetPlaceholder?: string;
  amountPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
  required?: boolean;
}

export default function AssetAmountInput({
  value,
  onAssetChange,
  onAmountChange,
  assetPlaceholder = "Asset",
  amountPlaceholder = "0.00",
  disabled,
  className,
  error,
  required,
}: AssetAmountInputProps) {
  const [localAsset, setLocalAsset] = useState<ExpandedAsset | null>(
    value?.asset ?? null,
  );
  const [localAmount, setLocalAmount] = useState<string>(
    value?.amount?.toString() ?? "",
  );

  const currentAsset = value?.asset ?? localAsset;
  const currentAmount = value?.amount?.toString() ?? localAmount;

  const handleAssetSelect = (asset: ExpandedAsset | null) => {
    if (!value?.asset) {
      setLocalAsset(asset);
    }
    onAssetChange?.(asset);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Allow empty string, numbers, and decimal points
    if (newValue === "" || /^\d*\.?\d*$/.test(newValue)) {
      if (!value?.amount) {
        setLocalAmount(newValue);
      }
      onAmountChange?.(newValue === "" ? null : newValue);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-stretch relative">
        <div className="flex-shrink-0">
          <AssetPicker
            value={currentAsset}
            onChange={handleAssetSelect}
            placeholder={assetPlaceholder}
            showLabel={false}
            assetDisplay="ticker"
            disabled={disabled}
            required={required}
            className="rounded-r-none w-[80px]"
          />
        </div>
        <Input
          type="text"
          value={currentAmount}
          onChange={handleAmountChange}
          placeholder={amountPlaceholder}
          disabled={disabled || !currentAsset}
          required={required}
          className={cn(
            "rounded-l-none flex-1 -ml-px",
            error && "border-red-500",
            !currentAsset && "bg-muted/50",
          )}
          aria-label="Amount"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
