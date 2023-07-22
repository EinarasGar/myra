import { AddTransactonViewModel } from "./addTransactionViewModel";

export interface AddTransactionGroupViewModel {
  transactions: AddTransactonViewModel[];
  description: string;
  category_id: number;
  date: string;
}
