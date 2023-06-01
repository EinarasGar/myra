import Grid from "@mui/material/Unstable_Grid2";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/material";
import { AssetAutoComplete } from "@/features/asset";
import CategoryAutoComplete from "./CategoryAutoComplete";
import { AccountsAutoComplete } from "@/features/accounts";
import TransactionDatePicker from "./TransactionDatePicker";
import AmountInput from "./AmountInput";
import DescriptionInput from "./DescriptionInput";
import {
  AddTransactonViewModel,
  AssetViewModel,
  CategoryViewModel,
  PortfolioAccountViewModel,
} from "@/models";

interface Props {
  defaultValue: AddTransactionRowState;
  onChange: (value: AddTransactionRowState) => void;
}

export interface AddTransactionRowState {
  componentId: string;
  description: string | null;
  category: CategoryViewModel | null;
  asset: AssetViewModel | null;
  account: PortfolioAccountViewModel | null;
  amount: number | null;
  date: Date | null;
}

const MemorizedDescriptionInput = React.memo(DescriptionInput);
const MemorizedCategoryAutoComplete = React.memo(CategoryAutoComplete);
const MemorizedTransactionDatePicker = React.memo(TransactionDatePicker);
const MemorizedAssetAutoComplete = React.memo(AssetAutoComplete);
const MemorizedAccountsAutoComplete = React.memo(AccountsAutoComplete);
const MemorizedAmountInput = React.memo(AmountInput);

function AddTransactionRow({ onChange, defaultValue }: Props) {
  const [description, setDescription] = useState<string | null>(
    defaultValue.description
  );
  const [category, setCategory] = useState<CategoryViewModel | null>(
    defaultValue.category
  );
  const [date, setDate] = useState<Date | null>(defaultValue.date);
  const [asset, setAsset] = useState<AssetViewModel | null>(defaultValue.asset);
  const [account, setAccount] = useState<PortfolioAccountViewModel | null>(
    defaultValue.account
  );
  const [amount, setAmount] = useState<number | null>(defaultValue.amount);

  useEffect(() => {
    if (category?.name === "Fuel") {
      setDescription("asda");
    }
  }, [category, setDescription]);

  useEffect(() => {
    if (
      defaultValue.description === description &&
      defaultValue.category === category &&
      defaultValue.asset === asset &&
      defaultValue.account === account &&
      defaultValue.amount === amount &&
      defaultValue.date === date
    )
      return;
    onChange({
      componentId: defaultValue.componentId,
      description,
      category,
      asset,
      account,
      amount,
      date,
    });
  }, [
    description,
    category,
    asset,
    account,
    amount,
    date,
    onChange,
    defaultValue,
  ]);

  console.log("rr");

  return (
    <Grid container spacing={2}>
      <Grid xs={4}>
        <MemorizedDescriptionInput
          value={description}
          onChange={useCallback((model) => {
            setDescription(model);
          }, [])}
        />
      </Grid>
      <Grid xs={4}>
        <MemorizedCategoryAutoComplete
          value={category}
          onChange={useCallback((model) => {
            setCategory(model);
          }, [])}
        />
      </Grid>
      <Grid xs={4}>
        <MemorizedTransactionDatePicker
          value={date}
          onChange={useCallback((model) => {
            setDate(model);
          }, [])}
        />
      </Grid>
      <Grid xs={4}>
        <MemorizedAssetAutoComplete
          value={asset}
          onChange={useCallback((model) => {
            setAsset(model);
          }, [])}
        />
      </Grid>
      <Grid xs={4}>
        <MemorizedAccountsAutoComplete
          value={account}
          onChange={useCallback((model) => {
            setAccount(model);
          }, [])}
        />
      </Grid>
      <Grid xs={4}>
        <MemorizedAmountInput
          value={amount}
          onChange={useCallback((model) => {
            setAmount(model);
          }, [])}
        />
      </Grid>
    </Grid>
  );
}

export default AddTransactionRow;
