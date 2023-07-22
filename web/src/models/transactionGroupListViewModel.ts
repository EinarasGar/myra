import { AssetViewModel } from "./assetViewModel";
import { TransactionGroupViewModel } from "./transactionGroupViewModel";

export interface TransactionGroupListViewModel {
  groups: TransactionGroupViewModel[];
  assets_lookup_table: AssetViewModel[];
}
