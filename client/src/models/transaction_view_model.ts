export interface AssetRespData {
  ticker: string;
  name: string;
  category: string;
  asset_id: number;
}

export interface TransactionGroupListRespData {
  groups: Array<TransactionGroupRespData>;
  assets_lookup_table: Array<AssetRespData>;
}

export interface TransactionGroupRespData {
  transactions: Array<TransactionRespData>;
  group_description: string;
  group_date: string;
  group_category: number;
  group_id: string;
}

export interface TransactionRespData {
  transaction_id: number;
  asset_id: number;
  quantity: number;
  category: number;
  date: string;
  description: string | null;
}

export interface AddTransactionReqData {
  asset_id: number;
  quantity: number;
  category: number;
  date: string;
  description: string | null;
}

export interface AddTransactionGroupReqData {
  transactions: Array<AddTransactionReqData>;
  description: string;
  date: string;
  category: number;
}
