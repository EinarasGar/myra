use business::dtos::accounts::full_account_dto::FullAccountDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::accounts::base_models::ownership_share::OwnershipShare;

use super::base_models::liquidity_type_id::RequiredLiquidityTypeId;
use super::base_models::{
    account::IdentifiableAccountViewModel, metadata_lookup::AccountMetadataLookupTables,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAccountsResponseViewModelRow {
    #[serde(flatten)]
    pub account: IdentifiableAccountViewModel,
    pub ownership_share: OwnershipShare,
    pub liquidity_type: RequiredLiquidityTypeId,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetAccountsResponseViewModel {
    pub accounts: Vec<GetAccountsResponseViewModelRow>,
    pub lookup_tables: AccountMetadataLookupTables,
}

impl From<FullAccountDto> for GetAccountsResponseViewModelRow {
    fn from(account: FullAccountDto) -> Self {
        Self {
            liquidity_type: RequiredLiquidityTypeId(account.liquidity_type.id),
            ownership_share: OwnershipShare::from_trusted(account.ownership_share),
            account: account.into(),
        }
    }
}
