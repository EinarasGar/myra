import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { useState } from "react";
import { CircularProgress } from "@mui/material";
import { AssetViewModel } from "@/models";
import { useAppSelector } from "@/hooks/storeHooks";
import { selectAssets } from "@/features/asset";
import { useSearchAssetsQuery } from "@/app/myraApi";
import { useDebounce } from "@/hooks";

function AssetAutoComplete() {
  const [selectedValue, setSelectedValue] = useState<AssetViewModel | null>(
    null
  );
  const [searchValue, setSearchValue] = useState("");
  const { debouncedValue } = useDebounce(searchValue, 300);
  const assets = useAppSelector(selectAssets);
  const { isFetching } = useSearchAssetsQuery(debouncedValue);
  return (
    <>
      <Autocomplete
        options={assets ?? []}
        autoHighlight
        getOptionLabel={(option) => option.name}
        groupBy={(option) => option.category}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            {option.ticker}·{option.name}
          </Box>
        )}
        onChange={(_, newValue: AssetViewModel | null) => {
          setSelectedValue(newValue);
        }}
        onInput={(e) => {
          const searchString = (e.target as HTMLInputElement).value;
          setSearchValue(searchString);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Choose an asset"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isFetching ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <span>{selectedValue?.name}</span>
    </>
  );
}

export default AssetAutoComplete;
