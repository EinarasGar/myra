use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct SetOnboardingVersionRequestViewModel {
    pub version: i32,
}
