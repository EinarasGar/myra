import { DateTimePicker } from "@mui/x-date-pickers";
import { useState } from "react";

interface Props {
  value: Date | null;
  onChange: (value: Date | null) => void;
}

function TransactionDatePicker({ onChange, value }: Props) {
  return (
    <DateTimePicker
      ampm={false}
      value={value}
      onChange={(val) => {
        onChange(val);
      }}
      className=" w-full"
    />
  );
}

export default TransactionDatePicker;
