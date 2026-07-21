use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::base_models::visibility::TransactionVisibility;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SetTransactionVisibilityRequestViewModel {
    pub visibility: TransactionVisibility,
}
