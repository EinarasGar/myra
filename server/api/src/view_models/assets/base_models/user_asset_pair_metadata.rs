use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::exchange_name::ExchangeName;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UserAssetPairMetadataViewModel {
    pub exchange: ExchangeName,
}
