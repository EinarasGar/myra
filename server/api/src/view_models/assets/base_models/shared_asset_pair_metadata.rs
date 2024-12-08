use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::asset_pair_metadata::AssetPairMetadataViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SharedAssetPairMetadataViewModel {
    #[serde(flatten)]
    pub common_metadata: Option<AssetPairMetadataViewModel>,

    #[serde(with = "rust_decimal::serde::arbitrary_precision_option")]
    #[schema(example = json!(dec!(27681777)))]
    pub volume: Option<Decimal>,
}
