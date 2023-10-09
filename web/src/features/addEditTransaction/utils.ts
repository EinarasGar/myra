/* eslint-disable react/destructuring-assignment */
import {
  AddTransactionGroupViewModel,
  AddTransactonViewModel,
  UpdateTransactionGroupViewModel,
  UpdateTransactionViewModel,
} from "@/models";
import { GroupState } from "./models/GroupState";
import { RowState } from "./models/RowState";

export function MapRowStatesToAddModel(
  transactionGroup: GroupState | null,
  tranasctions: RowState[]
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

export function MapRowStatesToUpdateModel(
  transactionGroup: GroupState | null,
  tranasctions: RowState[]
): UpdateTransactionGroupViewModel | null {
  if (transactionGroup === null) return null;
  if (
    !transactionGroup.category?.id ||
    !transactionGroup.date ||
    !transactionGroup.description
  )
    return null;

  if (tranasctions.length === 0) return null;

  const tranasctionModels: UpdateTransactionViewModel[] = [];

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
      id: trans.id > 0 ? trans.id : undefined,
      asset_id: trans.asset.id,
      category_id: trans.category.id,
      date: trans.date.toISOString(),
      quantity: trans.amount,
      account_id: trans.account.id,
      description: trans.description,
    });
  }

  return {
    id: transactionGroup.id,
    category_id: transactionGroup.category.id,
    date: transactionGroup.date.toISOString(),
    description: transactionGroup.description,
    transactions: tranasctionModels,
  };
}

export function GenerateNewId() {
  const randomNumber = Math.floor(Math.random() * 10000000000000000);
  return -randomNumber;
}
