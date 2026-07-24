use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use super::base_models::visibility::TransactionVisibility;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SetTransactionVisibilityRequestViewModel {
    pub visibility: TransactionVisibility,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SetTransactionsVisibilityRequestViewModel {
    pub transaction_ids: Vec<Uuid>,
    pub visibility: TransactionVisibility,
}
