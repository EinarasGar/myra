use serde::{Deserialize, Serialize};

use super::exchange_name::ExchangeName;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UserAssetPairMetadataViewModel {
    pub exchange: ExchangeName,
}
