import {
  AssetViewModel,
  CategoryViewModel,
  PortfolioAccountViewModel,
} from "@/models";

export interface RowState {
  id: number;
  description: string | null;
  category: CategoryViewModel | null;
  asset: AssetViewModel | null;
  account: PortfolioAccountViewModel | null;
  amount: number | null;
  date: Date | null;
  linkId: number | null;
}
