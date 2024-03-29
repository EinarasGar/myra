import { TransactionViewModel } from "./transactionViewModel";

export interface TransactionGroupViewModel {
  transactions: TransactionViewModel[];
  linked_transactions: TransactionViewModel[][];
  description: string;
  date: string;
  category_id: number;
  id: string;
}
