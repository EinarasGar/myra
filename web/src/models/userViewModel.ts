import { AssetViewModel } from "./assetViewModel";
import { PortfolioAccountViewModel } from "./portfolioAccountViewModel";

export interface UserViewModel {
  id: string;
  username: string;
  default_asset_id: AssetViewModel;
  portfolio_accounts: PortfolioAccountViewModel[];
}
