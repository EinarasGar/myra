import { TransactionGroupViewModel } from "./transactionGroupViewModel";
import { AssetViewModel } from "./assetViewModel";

export interface TransactionGroupListViewModel {
  groups: TransactionGroupViewModel[];
  assets_lookup_table: AssetViewModel[];
}
