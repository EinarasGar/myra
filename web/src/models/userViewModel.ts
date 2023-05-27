import { AssetViewModel } from "./assetViewModel";
import { PortfolioAccountViewModel } from "./portfolioViewModel";

export interface UserViewModel {
  id: string;
  username: string;
  default_asset_id: AssetViewModel;
  portfolio_accounts: PortfolioAccountViewModel[];
}

export interface AddUserViewModel {
  username: string;
  password: string;
  default_asset_id: number;
}
