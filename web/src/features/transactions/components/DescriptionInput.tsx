import { FormControl, InputLabel, OutlinedInput } from "@mui/material";

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
}

function DescriptionInput(props: Props) {
  const { onChange, value } = props;

  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="descirption-input">Description</InputLabel>
      <OutlinedInput
        id="description-input"
        value={value ?? ""}
        label="Description"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const str = event.target.value;
          onChange(str.length === 0 ? null : str);
        }}
      />
    </FormControl>
  );
}

export default DescriptionInput;
