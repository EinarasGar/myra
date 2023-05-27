import { AssetViewModel } from "../assetViewModel";
import { PortfolioAccountViewModel } from "../portfolioViewModel";

export interface TransactionViewModel {
  id: number;
  asset_id: number;
  quantity: number;
  category_id: number;
  date: string;
  account: PortfolioAccountViewModel;
  description?: string;
}

export interface TransactionGroupViewModel {
  transactions: TransactionViewModel[];
  description: string;
  date: string;
  category_id: number;
  id: string;
}

export interface TransactionGroupListViewModel {
  groups: TransactionGroupViewModel[];
  assets_lookup_table: AssetViewModel[];
}
