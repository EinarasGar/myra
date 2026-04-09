use serde::{Deserialize, Serialize};

use super::base_models::lookup::AssetLookupTables;
use super::get_assets::GetAssetsLineResponseViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct GetUserAssetsResponseViewModel {
    pub results: Vec<GetAssetsLineResponseViewModel>,
    pub lookup_tables: AssetLookupTables,
}
