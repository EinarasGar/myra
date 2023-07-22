import { AssetViewModel } from "./assetViewModel";
import { PortfolioAccountViewModel } from "./portfolioAccountViewModel";

export interface PortfolioEntryViewModel {
  asset: AssetViewModel;
  account: PortfolioAccountViewModel;
  sum: number;
}
