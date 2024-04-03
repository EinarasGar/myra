use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[schema(example = json!(
    {
        "username": "Einaras",
        "password": "BestP4ssword!"
      }
))]
pub struct LoginDetailsViewModel {
    /// Username.
    pub username: String,

    /// Password.
    pub password: String,
}
