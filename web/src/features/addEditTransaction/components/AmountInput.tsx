import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
} from "@mui/material";
import { useEffect, useState } from "react";

interface Props {
  value: number | null;
  ticker: string | undefined;
  onChange: (value: number | null) => void;
  onSubmit: () => void;
}

function AmountInput({ onChange, onSubmit, value, ticker }: Props) {
  const [localValue, setLocalValue] = useState<string>("");

  useEffect(() => {
    setLocalValue(value?.toString() ?? "");
  }, [value]);
  return (
    <FormControl
      fullWidth
      onKeyUp={(ev) => {
        if (ev.key === "Enter") {
          onSubmit();
        }
      }}
    >
      <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
      <OutlinedInput
        id="outlined-adornment-amount"
        startAdornment={
          ticker ? (
            <InputAdornment position="start">{ticker}</InputAdornment>
          ) : undefined
        }
        label="Amount"
        value={localValue}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setLocalValue(event.target.value);

          const parsed = parseFloat(event.target.value);
          onChange(Number.isNaN(parsed) ? null : parsed);
        }}
      />
    </FormControl>
  );
}

export default AmountInput;
