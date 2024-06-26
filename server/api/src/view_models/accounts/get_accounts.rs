use business::dtos::accounts::full_account_dto::FullAccountDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::{
    account::IdentifiableAccountViewModel, metadata_lookup::AccountMetadataLookupTables,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAccountsResponseViewModelRow {
    #[serde(flatten)]
    pub account: IdentifiableAccountViewModel,
    pub liquidity_type: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAccountsResponseViewModel {
    pub accounts: Vec<GetAccountsResponseViewModelRow>,
    pub lookup_tables: AccountMetadataLookupTables,
}

impl From<FullAccountDto> for GetAccountsResponseViewModelRow {
    fn from(account: FullAccountDto) -> Self {
        Self {
            liquidity_type: account.liquidity_type.id,
            account: account.into(),
        }
    }
}
