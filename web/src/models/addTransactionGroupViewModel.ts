import { AddTransactonViewModel } from "./addTransactonViewModel";

export interface AddTransactionGroupViewModel {
  transactions: AddTransactonViewModel[];
  description: string;
  category_id: number;
  date: string;
}
