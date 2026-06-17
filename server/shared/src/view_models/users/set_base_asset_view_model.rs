use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct SetBaseAssetRequestViewModel {
    pub asset_id: i32,
}
