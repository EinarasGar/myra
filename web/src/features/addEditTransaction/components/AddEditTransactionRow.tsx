import Grid from "@mui/material/Unstable_Grid2";
import React, { useCallback, useEffect, useState } from "react";
import { AssetAutoComplete } from "@/features/asset";
import CategoryAutoComplete from "../../categories/components/CategoryAutoComplete";
import { AccountsAutoComplete } from "@/features/accounts";
import { DatePicker } from "@/components";
import AmountInput from "./AmountInput";
import DescriptionInput from "./DescriptionInput";
import {
  AssetViewModel,
  CategoryViewModel,
  PortfolioAccountViewModel,
} from "@/models";
import { RowState } from "../models/RowState";

interface Props {
  defaultValue: RowState;
  onChange: (value: RowState) => void;
  onSubmit: () => void;
}

const MemorizedDescriptionInput = React.memo(DescriptionInput);
const MemorizedCategoryAutoComplete = React.memo(CategoryAutoComplete);
const MemorizedTransactionDatePicker = React.memo(DatePicker);
const MemorizedAssetAutoComplete = React.memo(AssetAutoComplete);
const MemorizedAccountsAutoComplete = React.memo(AccountsAutoComplete);
const MemorizedAmountInput = React.memo(AmountInput);

function AddEditTransactionRow({ onChange, onSubmit, defaultValue }: Props) {
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
  const [linkId, setLinkid] = useState<number | null>(defaultValue.linkId);

  // Custom logic to autofill data
  useEffect(() => {
    if (category?.name === "Fuel") {
      setDescription("Fuel");
    }
  }, [category, setDescription]);

  useEffect(() => {
    if (
      defaultValue.description === description &&
      defaultValue.category === category &&
      defaultValue.asset === asset &&
      defaultValue.account === account &&
      defaultValue.amount === amount &&
      defaultValue.date === date &&
      defaultValue.linkId === linkId
    )
      return;
    onChange({
      id: defaultValue.id,
      description,
      category,
      asset,
      account,
      amount,
      date,
      linkId,
    });
  }, [
    description,
    category,
    asset,
    account,
    amount,
    date,
    linkId,
    onChange,
    defaultValue,
  ]);

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
        <MemorizedAmountInput
          value={amount}
          ticker={asset?.ticker}
          onChange={useCallback((model) => {
            setAmount(model);
          }, [])}
          onSubmit={onSubmit}
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
          value={linkId}
          ticker={asset?.ticker}
          onChange={useCallback((model) => {
            setLinkid(model);
          }, [])}
          onSubmit={onSubmit}
        />
      </Grid>
    </Grid>
  );
}

export default AddEditTransactionRow;
