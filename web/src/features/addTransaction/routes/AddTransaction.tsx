import React, { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddTransactionRow, {
  AddTransactionRowState,
} from "../components/AddTransactionRow";
import AddTransactionGroupRow, {
  AddTransactionGroupState,
} from "../components/AddTransactionGroupRow";
import { AddTransactionGroupViewModel } from "@/models";
import {
  TransactionGroupSummary,
  TransactionSummary,
} from "@/features/transactions";
import { MapRowStatesToModel } from "../utils";
import { usePostTransactionGroupMutation } from "@/app/myraApi";
import { useAppSelector } from "@/hooks";
import { selectUserId } from "@/features/auth";

const MemoizedAddTransactionRow = React.memo(AddTransactionRow);

function AddTransaction() {
  const navigate = useNavigate();
  const userId = useAppSelector(selectUserId);
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

  const [selectedAccordion, setSelectedAccordion] = useState<string>("");
  const [saveGroup, saveGroupState] = usePostTransactionGroupMutation();

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
      oldState.map((c) => (c.componentId === x.componentId ? x : c))
    );
  }, []);

  if (!userId) return "Err";

  const reqModel: AddTransactionGroupViewModel | null = MapRowStatesToModel(
    transactionGroup,
    transactions
  );

  const handleAccordionChange =
    (id: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      if (isExpanded) setSelectedAccordion(id);
    };

  return (
    <>
      <div className=" m-5">
        {transactionGroup && (
          <Accordion expanded>
            <AccordionSummary>
              <TransactionGroupSummary
                categoryId={transactionGroup.category?.id}
                amounts={transactions.flatMap((trans) => {
                  if (trans.asset !== null && trans.amount !== null) {
                    return [
                      {
                        assetId: trans.asset.id,
                        quantity: trans.amount,
                      },
                    ];
                  }
                  return [];
                })}
                description={
                  transactionGroup.description ?? "Transaction Group"
                }
                date={transactionGroup.date}
              />
            </AccordionSummary>
            <AccordionDetails>
              <AddTransactionGroupRow
                defaultValue={transactionGroup}
                onChange={(model) => setTransactionGroup(model)}
              />
            </AccordionDetails>
          </Accordion>
        )}

        <Divider className="my-5" />

        {transactions.map((trans, i) => (
          <Accordion
            key={trans.componentId}
            expanded={selectedAccordion === trans.componentId}
            onChange={handleAccordionChange(trans.componentId)}
          >
            <AccordionSummary>
              <TransactionSummary
                categoryId={trans.category?.id}
                assetId={trans.asset?.id}
                amount={trans.amount}
                description={
                  trans.description ? trans.description : `Transaction ${i + 1}`
                }
                accountName={trans.account?.name}
                date={trans.date}
              />
            </AccordionSummary>
            <AccordionDetails>
              <MemoizedAddTransactionRow
                defaultValue={trans}
                onChange={transactionRowUpdated}
              />
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
      <Button
        onClick={() => {
          const newId = crypto.randomUUID();
          setTransactions([
            ...transactions,
            {
              componentId: newId,
              description: null,
              category: transactions[0].category,
              asset: transactions[0].asset,
              account: transactions[0].account,
              amount: null,
              date: transactions[0].date,
            },
          ]);
          setSelectedAccordion(newId);
        }}
      >
        Add Transaction
      </Button>
      <Button
        disabled={reqModel === null}
        onClick={() => {
          if (reqModel) {
            saveGroup({ transaction: reqModel, user_id: userId })
              .unwrap()
              .then((newViewModel) => {
                navigate("/transactions");
              })
              .catch((err) => {
                console.log(err);
              });
          }
        }}
      >
        Save
      </Button>
    </>
  );
}

export default AddTransaction;
