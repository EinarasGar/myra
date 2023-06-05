import { DateTimePicker } from "@mui/x-date-pickers";

interface Props {
  value: Date | null;
  onChange: (value: Date | null) => void;
}

function DatePicker({ onChange, value }: Props) {
  return (
    <DateTimePicker
      ampm={false}
      value={value}
      onChange={(val) => {
        onChange(val);
      }}
      className="w-full"
    />
  );
}

export default DatePicker;
