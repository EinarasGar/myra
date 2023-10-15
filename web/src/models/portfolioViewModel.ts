import { PortfolioEntryViewModel } from "./portfolioEntryViewModel";
import { AssetViewModel } from "./assetViewModel";

export interface PortfolioViewModel {
  portfolio_entries: PortfolioEntryViewModel[];
  reference_asset: AssetViewModel;
}
