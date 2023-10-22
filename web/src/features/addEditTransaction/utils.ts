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
  const linkedTranasctionModels: UpdateTransactionViewModel[][] = [];

  const transactionsNoLinkId = tranasctions.filter((x) => x.linkId === null);
  const transactionsWithLinkid = tranasctions.filter((x) => x.linkId !== null);
  const groupedByLinkId: { [key: string]: RowState[] } =
    transactionsWithLinkid.reduce(
      (r: { [key: string]: RowState[] }, a: RowState) => {
        if (a.linkId !== null) {
          r[a.linkId] = [...(r[a.linkId] || []), a];
        }
        return r;
      },
      {}
    );

  for (let i = 0; i < transactionsNoLinkId.length; i += 1) {
    const trans = transactionsNoLinkId[i];
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

  // for each unique link id
  for (const linkId in groupedByLinkId) {
    const linkedTransactions = groupedByLinkId[linkId];
    const linkedTransactionModels: UpdateTransactionViewModel[] = [];

    for (let i = 0; i < linkedTransactions.length; i += 1) {
      const trans = linkedTransactions[i];
      if (
        !trans.account?.id ||
        !trans.amount ||
        !trans.asset?.id ||
        !trans.category?.id ||
        !trans.date ||
        !trans.description
      )
        return null;

      linkedTransactionModels.push({
        id: trans.id > 0 ? trans.id : undefined,
        asset_id: trans.asset.id,
        category_id: trans.category.id,
        date: trans.date.toISOString(),
        quantity: trans.amount,
        account_id: trans.account.id,
        description: trans.description,
      });
    }

    linkedTranasctionModels.push(linkedTransactionModels);
  }

  return {
    category_id: transactionGroup.category.id,
    date: transactionGroup.date.toISOString(),
    description: transactionGroup.description,
    transactions: tranasctionModels,
    linked_transactions: linkedTranasctionModels,
  };
}

export function MapRowStatesToUpdateModel(
  transactionGroup: GroupState | null,
  tranasctions: RowState[]
): UpdateTransactionGroupViewModel | null {
  console.log(tranasctions);
  if (transactionGroup === null) return null;
  if (
    !transactionGroup.category?.id ||
    !transactionGroup.date ||
    !transactionGroup.description
  )
    return null;

  if (tranasctions.length === 0) return null;

  const tranasctionModels: UpdateTransactionViewModel[] = [];
  const linkedTranasctionModels: UpdateTransactionViewModel[][] = [];

  const transactionsNoLinkId = tranasctions.filter((x) => x.linkId === null);
  const transactionsWithLinkid = tranasctions.filter((x) => x.linkId !== null);
  const groupedByLinkId: { [key: string]: RowState[] } =
    transactionsWithLinkid.reduce(
      (r: { [key: string]: RowState[] }, a: RowState) => {
        if (a.linkId !== null) {
          r[a.linkId] = [...(r[a.linkId] || []), a];
        }
        return r;
      },
      {}
    );

  for (let i = 0; i < transactionsNoLinkId.length; i += 1) {
    const trans = transactionsNoLinkId[i];
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

  // for each unique link id
  for (const linkId in groupedByLinkId) {
    const linkedTransactions = groupedByLinkId[linkId];
    const linkedTransactionModels: UpdateTransactionViewModel[] = [];

    for (let i = 0; i < linkedTransactions.length; i += 1) {
      const trans = linkedTransactions[i];
      if (
        !trans.account?.id ||
        !trans.amount ||
        !trans.asset?.id ||
        !trans.category?.id ||
        !trans.date ||
        !trans.description
      )
        return null;

      linkedTransactionModels.push({
        id: trans.id > 0 ? trans.id : undefined,
        asset_id: trans.asset.id,
        category_id: trans.category.id,
        date: trans.date.toISOString(),
        quantity: trans.amount,
        account_id: trans.account.id,
        description: trans.description,
      });
    }

    linkedTranasctionModels.push(linkedTransactionModels);
  }

  return {
    id: transactionGroup.id,
    category_id: transactionGroup.category.id,
    date: transactionGroup.date.toISOString(),
    description: transactionGroup.description,
    transactions: tranasctionModels,
    linked_transactions: linkedTranasctionModels,
  };
}

export function GenerateNewId() {
  const randomNumber = Math.floor(Math.random() * 10000000000000000);
  return -randomNumber;
}
