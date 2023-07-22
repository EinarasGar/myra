use serde::{Deserialize, Serialize};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LoginDetailsViewModel {
    pub username: String,
    pub password: String,
}
