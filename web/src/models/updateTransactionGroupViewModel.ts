import { UpdateTransactonViewModel } from "./updateTransactionViewModel";

export interface UpdateTransactionGroupViewModel {
  id: string;
  transactions: UpdateTransactonViewModel[];
  description: string;
  category_id: number;
  date: string;
}
