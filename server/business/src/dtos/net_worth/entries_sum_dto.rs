use dal::models::entry_models::EntriesAssetSum;
use rust_decimal::Decimal;

#[derive(Debug)]
pub struct EntriesSumDto {
    pub asset_id: i32,
    pub quantity: Decimal,
}

impl From<EntriesAssetSum> for EntriesSumDto {
    fn from(model: EntriesAssetSum) -> Self {
        Self {
            asset_id: model.asset_id,
            quantity: model.sum,
        }
    }
}
