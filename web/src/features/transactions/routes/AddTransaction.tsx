import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/material";
import AddTransactionRow, {
  AddTransactionRowState,
} from "../components/AddTransactionRow";
import AddTransactionGroupRow, {
  AddTransactionGroupState,
} from "../components/AddTransactionGroupRow";
import { AddTransactionGroupViewModel } from "@/models";

const MemoizedAddTransactionRow = React.memo(AddTransactionRow);

function AddTransaction() {
  const [transactionGroup, setTransactionGroup] =
    useState<AddTransactionGroupState | null>(null);
  const [transactions, setTransactions] = useState<AddTransactionRowState[]>([
    {
      componentId: crypto.randomUUID(),
      description: null,
      category: null,
      asset: null,
      account: null,
      amount: null,
      date: null,
    },
  ]);

  useEffect(() => {
    if (transactions.length === 2 && transactionGroup === null) {
      setTransactionGroup({
        description: transactions[0].description,
        category: transactions[0].category,
        date: transactions[0].date,
      });
    }
  }, [transactions, transactionGroup]);

  const transactionRowUpdated = useCallback((x: AddTransactionRowState) => {
    setTransactions((oldState) =>
      oldState.map((c) => {
        if (c.componentId === x.componentId) {
          return x;
        }
        return c;
      })
    );
  }, []);

  const transactionGroupUpdated = useCallback((x: AddTransactionGroupState) => {
    setTransactionGroup(x);
  }, []);

  return (
    <>
      <div className=" m-5">
        {transactionGroup && (
          <AddTransactionGroupRow
            defaultValue={transactionGroup}
            onChange={transactionGroupUpdated}
          />
        )}
        {transactions.map((trans) => (
          <MemoizedAddTransactionRow
            key={trans.componentId}
            defaultValue={trans}
            onChange={transactionRowUpdated}
          />
        ))}
      </div>
      <Button
        onClick={() => {
          setTransactions([
            ...transactions,
            {
              componentId: crypto.randomUUID(),
              description: null,
              category: null,
              asset: null,
              account: null,
              amount: null,
              date: null,
            },
          ]);
        }}
      >
        Add Transaction
      </Button>
      <Button
        onClick={() => {
          const reqModel: AddTransactionGroupViewModel = {
            transactions: transactions.map((trans) => ({
              asset_id: trans.asset?.id ?? 0,
              category_id: trans.category?.id ?? 0,
              date: trans.date?.toISOString() ?? "",
              quantity: trans.amount ?? 0,
              account_id: trans.account?.id ?? "",
              description: trans.description ?? "",
            })),
            description: transactionGroup?.description ?? "",
            category_id: transactionGroup?.category?.id ?? 0,
            date: transactionGroup?.date?.toISOString() ?? "",
          };
          console.log(reqModel);
        }}
      >
        Save
      </Button>
    </>
  );
}

export default AddTransaction;
