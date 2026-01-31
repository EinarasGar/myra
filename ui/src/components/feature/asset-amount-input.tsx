import { useState } from "react";
import { type ExpandedAsset } from "@/types/assets";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import AssetPicker from "./asset-picker";

type Sign = "positive" | "negative";

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
  defaultSign?: Sign;
  lockSign?: boolean;
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
  defaultSign,
  lockSign = false,
}: AssetAmountInputProps) {
  const [localAsset, setLocalAsset] = useState<ExpandedAsset | null>(
    value?.asset ?? null,
  );
  const [localAmount, setLocalAmount] = useState<string>(
    value?.amount?.toString() ?? "",
  );
  const [sign, setSign] = useState<Sign>(defaultSign ?? "positive");

  const currentAsset = value?.asset ?? localAsset;
  const currentAmount = value?.amount?.toString() ?? localAmount;

  // Strip any leading sign from the display value (sign is shown separately)
  const displayAmount = currentAmount.replace(/^[+-]/, "");

  const isDefaultSign = sign === (defaultSign ?? "positive");
  const signChar = sign === "negative" ? "-" : "+";

  const emitAmount = (absValue: string, currentSign: Sign) => {
    if (absValue === "") {
      onAmountChange?.(null);
      return;
    }
    const signed = currentSign === "negative" ? `-${absValue}` : absValue;
    onAmountChange?.(signed);
  };

  const handleAssetSelect = (asset: ExpandedAsset | null) => {
    setLocalAsset(asset);
    onAssetChange?.(asset);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Only allow unsigned numbers — sign is managed separately
    if (newValue === "" || /^\d*\.?\d*$/.test(newValue)) {
      setLocalAmount(newValue);
      emitAmount(newValue, sign);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!defaultSign || lockSign) return;

    if (e.key === "Backspace" && !displayAmount && sign !== defaultSign) {
      e.preventDefault();
      setSign(defaultSign!);
      emitAmount("", defaultSign!);
      return;
    }

    if (e.key === "+" || e.key === "-") {
      e.preventDefault();
      const newSign: Sign = e.key === "+" ? "positive" : "negative";
      if (newSign !== sign) {
        setSign(newSign);
        emitAmount(displayAmount, newSign);
      }
    }
  };

  const handleSignClick = () => {
    if (!defaultSign || lockSign || disabled || !currentAsset) return;
    const newSign: Sign = sign === "positive" ? "negative" : "positive";
    setSign(newSign);
    emitAmount(displayAmount, newSign);
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
        <div className="relative flex-1 -ml-px">
          {defaultSign && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleSignClick}
              disabled={disabled || !currentAsset}
              className={cn(
                "absolute left-2.5 top-1/2 -translate-y-1/2 z-10 text-sm font-medium select-none",
                "focus:outline-none",
                disabled || !currentAsset
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer",
                isDefaultSign && !displayAmount
                  ? "text-muted-foreground/40"
                  : "text-foreground",
              )}
            >
              {signChar}
            </button>
          )}
          <Input
            type="text"
            value={displayAmount}
            onChange={handleAmountChange}
            onKeyDown={handleKeyDown}
            placeholder={amountPlaceholder}
            disabled={disabled || !currentAsset}
            required={required}
            className={cn(
              "rounded-l-none w-full",
              defaultSign && "pl-5",
              error && "border-red-500",
              !currentAsset && "bg-muted/50",
            )}
            aria-label="Amount"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
