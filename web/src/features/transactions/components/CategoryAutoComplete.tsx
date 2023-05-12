import * as React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { CircularProgress, Icon } from "@mui/material";
import { CategoryViewModel } from "@/models";
import { useGetCategoriesQuery } from "@/services/myra";

function CategoryAutoComplete() {
  const [value, setValue] = React.useState<CategoryViewModel | null>(null);
  const { data, isLoading } = useGetCategoriesQuery();

  return (
    <>
      <Autocomplete
        options={data ?? []}
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
          setValue(newValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Choose a category "
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <span>{value?.name}</span>
    </>
  );
}

export default CategoryAutoComplete;
