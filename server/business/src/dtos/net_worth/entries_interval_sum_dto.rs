use dal::models::entry_models::EntriesAssetIntervalSum;
use rust_decimal::Decimal;
use time::OffsetDateTime;

#[derive(Debug)]
pub struct EntriesIntervalSumDto {
    pub asset_id: i32,
    pub quantity: Decimal,
    pub time: OffsetDateTime,
}

impl From<EntriesAssetIntervalSum> for EntriesIntervalSumDto {
    fn from(model: EntriesAssetIntervalSum) -> Self {
        Self {
            asset_id: model.asset_id,
            quantity: model.sum,
            time: model.start_time,
        }
    }
}
