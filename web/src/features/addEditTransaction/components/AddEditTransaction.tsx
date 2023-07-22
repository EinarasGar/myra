import React, { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Divider,
  Menu,
  MenuItem,
} from "@mui/material";
import AddEditTransactionRow from "./AddEditTransactionRow";
import AddEditTransactionGroupRow from "./AddEditTransactionGroupRow";
import {
  TransactionGroupSummary,
  TransactionSummary,
} from "@/features/transactions";
import { GenerateNewId } from "../utils";
import { GroupState } from "../models/GroupState";
import { RowState } from "../models/RowState";

const MemoizedAddEditTransactionRow = React.memo(AddEditTransactionRow);

interface Props {
  initialGroup: GroupState | null;
  initialRows: RowState[];
  onSave: (group: GroupState, rows: RowState[]) => void;
}

function AddEditTransaction({ initialGroup, initialRows, onSave }: Props) {
  const [group, setGroup] = useState<GroupState | null>(initialGroup);
  const [rows, setRows] = useState<RowState[]>(initialRows);

  const [selectedAccordion, setSelectedAccordion] = useState<number>(0);

  const [contextMenu, setContextMenu] = React.useState<{
    mouseX: number;
    mouseY: number;
    transactionId: number;
  } | null>(null);

  const transactionRowUpdated = useCallback((x: RowState) => {
    setRows((oldState) => oldState.map((c) => (c.id === x.id ? x : c)));
  }, []);

  useEffect(() => {
    if (rows.length === 2 && group === null) {
      setGroup({
        id: crypto.randomUUID(),
        description: rows[0].description,
        category: rows[0].category,
        date: rows[0].date,
      });
    }
  }, [rows, group]);

  const handleAccordionChange =
    (id: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      if (isExpanded) setSelectedAccordion(id);
    };

  const handleClose = () => {
    setContextMenu(null);
  };

  return (
    <>
      <div className=" m-5">
        {group && (
          <Accordion expanded>
            <AccordionSummary>
              <TransactionGroupSummary
                categoryId={group.category?.id}
                amounts={rows.flatMap((trans) => {
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
                description={group.description ?? "Transaction Group"}
                date={group.date}
              />
            </AccordionSummary>
            <AccordionDetails>
              <AddEditTransactionGroupRow
                defaultValue={group}
                onChange={(model) => setGroup(model)}
              />
            </AccordionDetails>
          </Accordion>
        )}

        <Divider className="my-5" />

        {rows.map((trans, i) => (
          <Accordion
            key={trans.id}
            expanded={selectedAccordion === trans.id}
            onChange={handleAccordionChange(trans.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(
                contextMenu === null
                  ? {
                      mouseX: e.clientX + 2,
                      mouseY: e.clientY - 6,
                      transactionId: trans.id,
                    }
                  : null
              );
            }}
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
              <MemoizedAddEditTransactionRow
                defaultValue={trans}
                onChange={transactionRowUpdated}
              />
            </AccordionDetails>
            {contextMenu?.transactionId === trans.id && (
              <Menu
                open={contextMenu !== null}
                onClose={handleClose}
                anchorReference="anchorPosition"
                anchorPosition={
                  contextMenu !== null
                    ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                    : undefined
                }
              >
                <MenuItem onClick={handleClose}>
                  {contextMenu?.transactionId}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleClose();
                    setRows((oldState) =>
                      oldState.filter((x) => x.id !== contextMenu.transactionId)
                    );
                  }}
                >
                  Delete
                </MenuItem>
              </Menu>
            )}
          </Accordion>
        ))}
      </div>
      <Button
        onClick={() => {
          const newId = GenerateNewId();
          setRows([
            ...rows,
            {
              id: newId,
              description: null,
              category: rows[0].category,
              asset: rows[0].asset,
              account: rows[0].account,
              amount: null,
              date: rows[0].date,
            },
          ]);
          setSelectedAccordion(newId);
        }}
      >
        Add Transaction
      </Button>
      <Button
        onClick={() => {
          if (group && rows.length > 0) {
            onSave(group, rows);
          }
        }}
      >
        Save
      </Button>
    </>
  );
}

export default AddEditTransaction;
