export interface AddTransactonViewModel {
  asset_id: number;
  quantity: number;
  category_id: number;
  date: string;
  account_id?: string;
  description?: string;
}
