import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { TransactionGroupViewModel } from "@/models";
import AddEditTransaction from "../components/AddEditTransaction";
import { GroupState } from "../models/GroupState";
import {
  useGetCategoriesQuery,
  usePostTransactionGroupByIdMutation,
} from "@/app/myraApi";
import { RowState } from "../models/RowState";
import { useAppSelector } from "@/hooks";
import { selectAssets } from "@/features/asset";
import { useAccounts } from "@/features/accounts";
import { MapRowStatesToUpdateModel } from "../utils";
import { selectUserId } from "@/features/auth";

function EditTransactions() {
  const { transactionId } = useParams();
  const location = useLocation();
  const { data, isLoading } = useGetCategoriesQuery();
  const userId = useAppSelector(selectUserId);
  const assets = useAppSelector(selectAssets);
  const state = location.state as TransactionGroupViewModel | null;
  const navigate = useNavigate();

  const [updateGroup, updateGroupState] = usePostTransactionGroupByIdMutation();

  if (!userId) return <span>loading</span>;

  const onSave = (group: GroupState, rows: RowState[]) => {
    const mapped = MapRowStatesToUpdateModel(group, rows);
    if (mapped) {
      updateGroup({ group: mapped, user_id: userId })
        .unwrap()
        .then(() => {
          navigate("/transactions");
        })
        .catch((err) => {
          console.log(err);
        });
    }
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
