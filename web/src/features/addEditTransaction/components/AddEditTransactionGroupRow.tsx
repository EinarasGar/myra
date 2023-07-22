import Grid from "@mui/material/Unstable_Grid2";
import React, { useCallback, useEffect, useState } from "react";
import CategoryAutoComplete from "../../categories/components/CategoryAutoComplete";
import { DatePicker } from "@/components";
import DescriptionInput from "./DescriptionInput";
import { CategoryViewModel } from "@/models";
import { GroupState } from "../models/GroupState";

interface Props {
  defaultValue: GroupState;
  onChange: (value: GroupState) => void;
}

const MemorizedDescriptionInput = React.memo(DescriptionInput);
const MemorizedCategoryAutoComplete = React.memo(CategoryAutoComplete);
const MemorizedTransactionDatePicker = React.memo(DatePicker);

function AddEditTransactionGroupRow({ onChange, defaultValue }: Props) {
  const [description, setDescription] = useState<string | null>(
    defaultValue.description
  );
  const [category, setCategory] = useState<CategoryViewModel | null>(
    defaultValue.category
  );
  const [date, setDate] = useState<Date | null>(defaultValue.date);

  useEffect(() => {
    if (
      defaultValue.description === description &&
      defaultValue.category === category &&
      defaultValue.date === date
    )
      return;
    onChange({
      id: defaultValue.id,
      description,
      category,
      date,
    });
  }, [description, category, date, onChange, defaultValue]);

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
    </Grid>
  );
}

export default AddEditTransactionGroupRow;
