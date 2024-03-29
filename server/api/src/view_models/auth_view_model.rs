use serde::{Deserialize, Serialize};

#[typeshare::typeshare]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AuthViewModel {
    pub token: String,
}
