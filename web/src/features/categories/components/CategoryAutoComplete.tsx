import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import { CategoryViewModel } from "@/models";
import { useGetCategoriesQuery } from "@/app/myraApi";

interface Props {
  value: CategoryViewModel | null;
  onChange: (value: CategoryViewModel | null) => void;
}

function CategoryAutoComplete({ onChange, value }: Props) {
  const { data, isLoading } = useGetCategoriesQuery();

  return (
    <Autocomplete
      options={data ?? []}
      value={value}
      autoHighlight
      loading={isLoading}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          <Icon>{option.icon}</Icon>
          {option.name}
        </Box>
      )}
      onChange={(_, newValue: CategoryViewModel | null) => {
        onChange(newValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Choose a category"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default CategoryAutoComplete;
