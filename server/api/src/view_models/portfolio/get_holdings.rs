use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use super::base_models::metadata_lookup::HoldingsMetadataLookupTables;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetHoldingsResponseViewModelRow {
    pub account_id: Uuid,
    pub asset_id: i32,
    pub units: Decimal,
    pub value: Option<Decimal>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetHoldingsResponseViewModel {
    pub holdings: Vec<GetHoldingsResponseViewModelRow>,
    pub lookup_tables: HoldingsMetadataLookupTables,
}
