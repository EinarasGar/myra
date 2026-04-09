import { Suspense, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import useCreateUserAsset from "@/hooks/api/use-create-user-asset";
import { useUserId } from "@/hooks/use-auth";
import AssetPicker from "@/components/feature/asset-picker";
import type { ExpandedAsset } from "@/types/assets";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { AssetsApiFactory } from "@/api";
import { QueryKeys } from "@/constants/query-keys";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateAssetDialog({ open, onOpenChange }: Props) {
  const userId = useUserId();
  const mutation = useCreateUserAsset(userId);
  const { data: assetTypesData } = useQuery({
    queryKey: [QueryKeys.ASSET_TYPES],
    queryFn: () => AssetsApiFactory().getAssetTypes(),
    staleTime: 1000 * 60 * 30,
  });
  const assetTypes = assetTypesData?.data?.asset_types ?? [];
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [assetType, setAssetType] = useState<string>("");
  const [basePairAsset, setBasePairAsset] = useState<ExpandedAsset | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setTicker("");
    setAssetType("");
    setBasePairAsset(null);
    setError(null);
  };

  const isValid =
    name.trim() !== "" &&
    ticker.trim() !== "" &&
    assetType !== "" &&
    basePairAsset !== null;

  const handleSubmit = () => {
    setError(null);
    if (!isValid || !basePairAsset) return;

    mutation.mutate(
      {
        name: name.trim(),
        ticker: ticker.trim(),
        asset_type: Number(assetType),
        base_asset_id: basePairAsset.id,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.data?.message) {
            setError(err.response.data.message);
          } else {
            setError("Failed to create asset. Please try again.");
          }
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Asset</DialogTitle>
          <DialogDescription>
            Add a new custom asset to your portfolio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="asset-name">Name</Label>
            <Input
              id="asset-name"
              placeholder="e.g. My Custom Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-ticker">Ticker</Label>
            <Input
              id="asset-ticker"
              placeholder="e.g. MCF"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label>Asset Type</Label>
            <Select
              value={assetType}
              onValueChange={(value) => setAssetType(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset type" />
              </SelectTrigger>
              <SelectContent>
                {assetTypes.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Base Pair Asset</Label>
            <Suspense fallback={<Skeleton className="h-10 w-full" />}>
              <AssetPicker
                value={basePairAsset}
                onChange={setBasePairAsset}
                placeholder="Select base pair asset..."
                showLabel={false}
              />
            </Suspense>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
