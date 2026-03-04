use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::lookup::AssetLookupTables;
use super::get_assets::GetAssetsLineResponseViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetUserAssetsResponseViewModel {
    pub results: Vec<GetAssetsLineResponseViewModel>,
    pub lookup_tables: AssetLookupTables,
}
