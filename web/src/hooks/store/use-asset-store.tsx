import { Asset, AssetType, ExpandedAsset } from "@/types/assets";
import { useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface AssetsState {
  assets: Asset[];
  assetTypes: AssetType[];

  add: (assets: Asset[]) => void;
  addType: (assetTypes: AssetType[]) => void;
}

export const useAssetStore = create<AssetsState>((set) => ({
  assets: [],
  assetTypes: [],
  add: (newAssets) =>
    set((state) => ({
      ...state,
      assets: [
        ...state.assets,
        ...newAssets.filter(
          (newAsset) => !state.assets.some((asset) => asset.id === newAsset.id),
        ),
      ],
    })),
  addType: (newAssetTypes) =>
    set((state) => ({
      ...state,
      assetTypes: [
        ...state.assetTypes,
        ...newAssetTypes.filter(
          (newAsset) =>
            !state.assetTypes.some((asset) => asset.id === newAsset.id),
        ),
      ],
    })),
}));

export const useExpandedAssets = () => {
  const [assets, assetTypes] = useAssetStore(
    useShallow((state) => [state.assets, state.assetTypes]),
  );

  return useMemo(
    () => {
      return assets.map(
        (asset) =>
          ({
            id: asset.id,
            ticker: asset.ticker,
            name: asset.name,
            type: assetTypes.find((t) => t.id === asset.asset_type_id),
          }) as ExpandedAsset,
      );
    },
    [assets, assetTypes], // Only recompute when these change
  );
};
