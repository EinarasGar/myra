/* eslint-disable react/destructuring-assignment */
import { AddTransactionGroupViewModel, AddTransactonViewModel } from "@/models";
import { AddTransactionGroupState } from "./components/AddTransactionGroupRow";
import { AddTransactionRowState } from "./components/AddTransactionRow";

export function MapRowStatesToModel(
  transactionGroup: AddTransactionGroupState | null,
  tranasctions: AddTransactionRowState[]
): AddTransactionGroupViewModel | null {
  if (transactionGroup === null) return null;
  if (
    !transactionGroup.category?.id ||
    !transactionGroup.date ||
    !transactionGroup.description
  )
    return null;

  if (tranasctions.length === 0) return null;

  const tranasctionModels: AddTransactonViewModel[] = [];

  for (let i = 0; i < tranasctions.length; i += 1) {
    const trans = tranasctions[i];
    if (
      !trans.account?.id ||
      !trans.amount ||
      !trans.asset?.id ||
      !trans.category?.id ||
      !trans.date ||
      !trans.description
    )
      return null;

    tranasctionModels.push({
      asset_id: trans.asset.id,
      category_id: trans.category.id,
      date: trans.date.toISOString(),
      quantity: trans.amount,
      account_id: trans.account.id,
      description: trans.description,
    });
  }

  return {
    category_id: transactionGroup.category.id,
    date: transactionGroup.date.toISOString(),
    description: transactionGroup.description,
    transactions: tranasctionModels,
  };
}
