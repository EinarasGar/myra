import { AssetViewModel } from "./assetViewModel";
import { AssetRateViewModel } from "./assetRateViewModel";

export interface AssetPairViewModel {
  pair1: AssetViewModel;
  pair2: AssetViewModel;
  rates: AssetRateViewModel[];
}
