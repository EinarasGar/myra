import { PortfolioAccountViewModel } from "./portfolioAccountViewModel";
import { AssetViewModel } from "./assetViewModel";

export interface UserViewModel {
  id: string;
  username: string;
  default_asset_id: AssetViewModel;
  portfolio_accounts: PortfolioAccountViewModel[];
  custom_assets: AssetViewModel[];
}
