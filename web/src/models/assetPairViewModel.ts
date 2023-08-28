import { AssetRateViewModel } from "./assetRateViewModel";
import { AssetViewModel } from "./assetViewModel";

export interface AssetPairViewModel {
  pair1: AssetViewModel;
  pair2: AssetViewModel;
  rates: AssetRateViewModel[];
}
