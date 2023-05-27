import {
  Autocomplete,
  Box,
  CircularProgress,
  Skeleton,
  TextField,
  createFilterOptions,
} from "@mui/material";
import { useState } from "react";
import { useAccounts } from "../hooks/accountHooks";
import { PortfolioAccountViewModel } from "@/models";
import { usePostAccountMutation } from "@/app/myraApi";
import { useAppSelector } from "@/hooks";
import { selectUserId } from "@/features/auth";

const filter = createFilterOptions<AccountAutocompleteModel>();

interface AccountAutocompleteModel {
  newAccount?: string;
  viewModel: PortfolioAccountViewModel;
}

function AccountsAutoComplete() {
  const userId = useAppSelector(selectUserId);
  const [value, setValue] = useState<AccountAutocompleteModel | null>(null);
  const { data, isLoading } = useAccounts();
  const [saveAccount, saveAccountSate] = usePostAccountMutation();

  if (!userId) {
    return <Skeleton variant="rectangular" />;
  }

  const loadingState = isLoading || saveAccountSate.isLoading;

  // Creates new array of objects for autocomplete. This will be used for functioanlity
  // to add new accounts
  const autocompleteData: AccountAutocompleteModel[] | undefined = data?.map(
    (viewModel) => ({
      viewModel,
    })
  );

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => {
        let newAccountName: string;

        // Get new account name or set existing one
        if (typeof newValue === "string") {
          // Account selected by typing in and pressing enter
          newAccountName = newValue;
        } else if (newValue && newValue.newAccount) {
          // Account selected by clicking Add button
          newAccountName = newValue.newAccount;
        } else {
          // Account selected by clicking on one of the options
          setValue(newValue);
          return;
        }

        // Use the string typed in to check if it already exists
        const existingValue = autocompleteData?.find(
          (x) => x.viewModel.name === newAccountName
        );

        // Set the value if already exists
        if (existingValue) {
          setValue(existingValue);
          return;
        }

        const updatedState: AccountAutocompleteModel = {
          viewModel: {
            name: newAccountName,
          },
        };

        // Set new model temporarily, as this doesnt have account id
        setValue(updatedState);

        // Save account and update model to contain account id
        saveAccount({
          account: updatedState.viewModel,
          user_id: userId,
        })
          .unwrap()
          .then((newViewModel) => {
            setValue({ viewModel: newViewModel });
          })
          .catch((err) => {
            setValue(null);
          });
      }}
      filterOptions={(options, params) => {
        const filtered = filter(options, params);

        const { inputValue } = params;
        // Suggest the creation of a new value
        const isExisting = options.some(
          (option) => inputValue === option.viewModel.name
        );
        if (inputValue !== "" && !isExisting) {
          filtered.push({
            newAccount: inputValue,
            viewModel: {
              name: `Add "${inputValue}"`,
            },
          });
        }

        return filtered;
      }}
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      disabled={saveAccountSate.isLoading}
      options={autocompleteData ?? []}
      getOptionLabel={(option) => {
        // Value selected with enter, right from the input
        if (typeof option === "string") {
          return option;
        }
        // Add "xxx" option created dynamically
        if (option.newAccount) {
          return option.newAccount;
        }
        // Regular option
        return option.viewModel.name;
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          {option.viewModel.name}
        </Box>
      )}
      freeSolo
      renderInput={(params) => (
        <TextField
          {...params}
          label="Choose an account"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loadingState ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default AccountsAutoComplete;
