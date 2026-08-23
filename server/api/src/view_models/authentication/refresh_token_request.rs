use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RefreshTokenRequestViewModel {
    pub refresh_token: String,
}
