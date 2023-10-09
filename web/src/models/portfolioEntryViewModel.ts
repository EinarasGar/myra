import { PortfolioAccountViewModel } from "./portfolioAccountViewModel";
import { AssetViewModel } from "./assetViewModel";
import { AssetRateViewModel } from "./assetRateViewModel";

export interface PortfolioEntryViewModel {
  asset: AssetViewModel;
  account: PortfolioAccountViewModel;
  sum: number;
  last_rate?: AssetRateViewModel;
}
