export interface AddTransactonViewModel {
  asset_id: number;
  quantity: number;
  category_id: number;
  date: string;
  account_id?: string;
  description?: string;
}

export interface AddTransactionGroupViewModel {
  transactions: AddTransactonViewModel[];
  description: string;
  category_id: number;
  date: string;
}
