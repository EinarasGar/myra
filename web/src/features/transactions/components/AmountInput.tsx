import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
} from "@mui/material";

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
}

function AmountInput({ onChange, value }: Props) {
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="outlined-adornment-amount">Amount</InputLabel>
      <OutlinedInput
        id="outlined-adornment-amount"
        // startAdornment={<InputAdornment position="start">$</InputAdornment>}
        label="Amount"
        value={value ?? ""}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const parsed = parseFloat(event.target.value);
          onChange(Number.isNaN(parsed) ? null : parsed);
        }}
      />
    </FormControl>
  );
}

export default AmountInput;
