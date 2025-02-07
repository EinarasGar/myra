import { Asset } from "@/types/assets";
import { create } from "zustand";

interface AssetsState {
  assets: Asset[];
  add: (assets: Asset[]) => void;
}

export const useAssetStore = create<AssetsState>((set) => ({
  assets: [],
  add: (newAssets) =>
    set((state) => ({
      ...state,
      assets: [
        ...state.assets,
        ...newAssets.filter(
          (newAsset) => !state.assets.some((asset) => asset.id === newAsset.id)
        ),
      ],
    })),
}));
