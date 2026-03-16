use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct AccountResult {
    pub account_id: Uuid,
    pub account_name: String,
    pub account_type: String,
    pub liquidity_type: String,
}
