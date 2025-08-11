use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::metadata_lookup::HoldingsMetadataLookupTables;
use crate::view_models::accounts::base_models::account_id::RequiredAccountId;
use crate::view_models::assets::base_models::asset_id::RequiredAssetId;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetHoldingsResponseViewModelRow {
    pub account_id: RequiredAccountId,
    pub asset_id: RequiredAssetId,
    pub units: Decimal,
    pub value: Option<Decimal>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetHoldingsResponseViewModel {
    pub holdings: Vec<GetHoldingsResponseViewModelRow>,
    pub lookup_tables: HoldingsMetadataLookupTables,
}
