use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateBindingRequestViewModel {
    pub sverto_account_id: uuid::Uuid,
    pub provider_account_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateBindingResponseViewModel {
    pub binding_id: uuid::Uuid,
}
