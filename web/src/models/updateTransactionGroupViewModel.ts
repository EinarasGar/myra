import { UpdateTransactionViewModel } from "./updateTransactionViewModel";

export interface UpdateTransactionGroupViewModel {
  id: string;
  transactions: UpdateTransactionViewModel[];
  description: string;
  category_id: number;
  date: string;
}
