import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { TransactionGroupViewModel } from "@/models";
import AddEditTransaction from "../components/AddEditTransaction";
import { GroupState } from "../models/GroupState";
import { useGetCategoriesQuery } from "@/app/myraApi";
import { RowState } from "../models/RowState";
import { useAppSelector } from "@/hooks";
import { selectAssets } from "@/features/asset";
import { useAccounts } from "@/features/accounts";

function EditTransactions() {
  const { transactionId } = useParams();
  const location = useLocation();
  const { data, isLoading } = useGetCategoriesQuery();
  const assets = useAppSelector(selectAssets);
  const state = location.state as TransactionGroupViewModel | null;

  const onSave = (group: GroupState, rows: RowState[]) => {
    console.log(group);
    console.log(rows);
  };

  if (!state || !data) return <p>no</p>;

  const group: GroupState = {
    id: state.id,
    description: state.description,
    category: data.find((x) => x.id === state.category_id) ?? null,
    date: new Date(state.date),
  };

  const rows: RowState[] = state.transactions.map((trans) => {
    const mappedRow: RowState = {
      id: trans.id,
      description: trans.description ?? null,
      category: data.find((x) => x.id === trans.category_id) ?? null,
      asset: assets.find((x) => x.id === trans.asset_id) ?? null,
      account: trans.account,
      amount: trans.quantity,
      date: new Date(trans.date),
    };

    return mappedRow;
  });
  return (
    <AddEditTransaction
      initialGroup={group}
      initialRows={rows}
      onSave={onSave}
    />
  );
}

export default EditTransactions;
