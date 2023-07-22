import { PortfolioAccountViewModel } from "./portfolioAccountViewModel";

export interface TransactionViewModel {
  id: number;
  asset_id: number;
  quantity: number;
  category_id: number;
  date: string;
  account: PortfolioAccountViewModel;
  description?: string;
}
