import { PortfolioAccountViewModel } from "./portfolioAccountViewModel";
import { AssetViewModel } from "./assetViewModel";
import { AssetRateViewModel } from "./assetRateViewModel";

export interface PortfolioEntryViewModel {
  asset: AssetViewModel;
  base_asset?: AssetViewModel;
  account: PortfolioAccountViewModel;
  sum: number;
  last_rate?: AssetRateViewModel;
  last_reference_rate?: AssetRateViewModel;
  sum_of_costs?: number;
}
