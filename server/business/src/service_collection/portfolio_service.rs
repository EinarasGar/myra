use std::collections::HashSet;

#[mockall_double::double]
use dal::database_context::MyraDb;
use uuid::Uuid;

use crate::dtos::asset_rate_dto::AssetRateDto;
use crate::dtos::assets::asset_id_dto::AssetIdDto;
use crate::dtos::net_worth::range_dto::RangeDto;
use crate::entities::net_worth::net_wroth_history::NetWorthHistory;

use super::asset_rates_service::AssetRatesService;
use super::entries_service::EntriesService;

pub struct PortfolioService {
    _db_context: MyraDb,
    entries_service: EntriesService,
    asset_rates_service: AssetRatesService,
}

impl PortfolioService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            _db_context: db.clone(),
            entries_service: EntriesService::new(db.clone()),
            asset_rates_service: AssetRatesService::new(db.clone()),
        }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_full_portfolio_history(
        &self,
        user_id: Uuid,
        reference_asset: AssetIdDto,
        range_dto: RangeDto,
    ) -> anyhow::Result<Vec<AssetRateDto>> {
        let range = range_dto.clone().try_into()?;

        let mut net_worth_history = NetWorthHistory::new(reference_asset.clone(), range);

        let start_time = range.start_time();

        if let Some(start_time) = start_time {
            let initial_sums = self
                .entries_service
                .get_entries_sums_at_timestamp(user_id, start_time)
                .await?;
            net_worth_history.add_initial_entries(initial_sums);
        }

        let scoped_sums = self
            .entries_service
            .get_entries_interval_sums(user_id, range_dto)
            .await?;

        net_worth_history.add_entries(scoped_sums);

        if !net_worth_history.entries_exist() {
            return Ok(vec![]);
        }

        let asset_first_occurances = net_worth_history.get_asset_first_occurance_dates();
        //temp for now, later replace with variable start data
        let lowest_date = asset_first_occurances.values().min().unwrap().clone();
        let asset_ids = asset_first_occurances
            .keys()
            .map(|x| x.0)
            .collect::<HashSet<i32>>();

        let asset_rate_queues = self
            .asset_rates_service
            .get_assets_rates_default_from_date(reference_asset.0, asset_ids, Some(lowest_date))
            .await?;

        net_worth_history.add_asset_rates(asset_rate_queues);

        let history = net_worth_history.get_networth_history();

        Ok(history)
    }
}
