use dal::models::asset_pair_shared_metadta::AssetPairSharedMetadata;
use rust_decimal::Decimal;

pub struct SharedAssetPairMetadataDto {
    pub volume: Decimal,
}

impl From<AssetPairSharedMetadata> for SharedAssetPairMetadataDto {
    fn from(p: AssetPairSharedMetadata) -> Self {
        Self { volume: p.volume }
    }
}

impl From<SharedAssetPairMetadataDto> for AssetPairSharedMetadata {
    fn from(p: SharedAssetPairMetadataDto) -> Self {
        Self { volume: p.volume }
    }
}
