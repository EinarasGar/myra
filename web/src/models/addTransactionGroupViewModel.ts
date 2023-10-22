import { AddTransactonViewModel } from "./addTransactonViewModel";

export interface AddTransactionGroupViewModel {
  transactions: AddTransactonViewModel[];
  linked_transactions: AddTransactonViewModel[][];
  description: string;
  category_id: number;
  date: string;
}
