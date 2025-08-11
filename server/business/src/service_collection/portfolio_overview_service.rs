use std::collections::{HashMap, HashSet, VecDeque};

#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::models::portfolio_models::Holding;
use dal::models::transaction_models::TransactionWithEntriesModel;
use dal::queries::{entries_queries, transaction_queries};
use dal::query_params::get_transaction_with_entries_params::GetTransactionWithEntriesParams;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::dtos::asset_id_date_dto::AssetIdDateDto;
use crate::dtos::asset_pair_date_dto::AssetPairDateDto;
use crate::dtos::asset_pair_rate_dto::AssetPairRateDto;
use crate::dtos::assets::asset_id_dto::AssetIdDto;
use crate::dtos::portfolio::holding::HoldingDto;
use crate::dtos::portfolio::overview::PortfolioOverviewDto;
use crate::entities::portfolio_overview::portfolio::{
    Portfolio, PortfolioAction, ReferentialPortfolioAction,
};
use crate::entities::transactions::transaction::{Transaction, TransactionPortfolioAction};
use crate::entities::transactions::transaction_types::create_transactions_from_transaction_with_entries_models;

#[mockall_double::double]
use super::asset_rates_service::AssetRatesService;
#[mockall_double::double]
use super::asset_service::AssetsService;
#[mockall_double::double]
use super::transaction_service::TransactionService;

pub struct PortfolioOverviewService {
    #[allow(dead_code)]
    db: MyraDb,
    _transaction_service: TransactionService,
    asset_rates_service: AssetRatesService,
    asset_service: AssetsService,
}

impl PortfolioOverviewService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            db: db.clone(),
            _transaction_service: TransactionService::new(db.clone()),
            asset_rates_service: AssetRatesService::new(db.clone()),
            asset_service: AssetsService::new(db.clone()),
        }
    }

    pub async fn get_holdings(&self, user_id: Uuid) -> anyhow::Result<Vec<HoldingDto>> {
        let query = entries_queries::get_holdings(user_id);
        let ret = self.db.fetch_all::<Holding>(query).await?;
        Ok(ret.into_iter().map(|h| h.into()).collect())
    }

    pub async fn get_portfolio_overview(
        &self,
        reference_asset_id: AssetIdDto,
        user_id: Uuid,
    ) -> anyhow::Result<PortfolioOverviewDto> {
        //let reference_asset_id = AssetIdDto(3);
        let query_params = GetTransactionWithEntriesParams::by_user_id(user_id);

        let query = transaction_queries::get_transaction_with_entries(query_params);
        let models = self
            .db
            .fetch_all::<TransactionWithEntriesModel>(query)
            .await?;

        tracing::trace!("Got transactions: {:#?}", models);
        let transcations: Vec<Transaction> =
            create_transactions_from_transaction_with_entries_models(models)?;

        let mut portfolio = Portfolio::new();

        let mut regular_actions: Vec<Box<dyn PortfolioAction>> = Vec::new();
        let mut refferential_actions: Vec<Box<dyn ReferentialPortfolioAction>> = Vec::new();

        for transaction in transcations {
            let portfolio_action = transaction.get_portfolio_action()?;
            match portfolio_action {
                TransactionPortfolioAction::None => {}
                TransactionPortfolioAction::Regular(portfolio_action) => {
                    regular_actions.push(portfolio_action)
                }
                TransactionPortfolioAction::Referential(referential_portfolio_action) => {
                    refferential_actions.push(referential_portfolio_action)
                }
            }
        }

        let mut asset_id_dates: Vec<AssetIdDateDto> = Vec::new();
        refferential_actions.iter().for_each(|action| {
            asset_id_dates.push(AssetIdDateDto {
                asset_id: action.get_asset_id().0,
                date: action.date(),
            })
        });

        let asset_id_hashset: HashSet<i32> = asset_id_dates.iter().map(|a| a.asset_id).collect();
        let base_pair_ids = self
            .asset_service
            .get_assets_base_pairs(asset_id_hashset)
            .await?;

        let mut asset_pairs: Vec<AssetPairDateDto> = Vec::new();
        refferential_actions.iter().for_each(|action| {
            let base_pair_id = *base_pair_ids.get(&action.get_asset_id().0).unwrap();
            if base_pair_id == reference_asset_id.0 {
                return;
            }
            asset_pairs.push(AssetPairDateDto {
                asset1_id: base_pair_id,
                asset2_id: reference_asset_id.0,
                date: action.date(),
            })
        });

        let rates = self
            .asset_rates_service
            .get_pair_prices_by_dates(asset_pairs.clone())
            .await?;

        let mut rates: VecDeque<Option<AssetPairRateDto>> = rates.into_iter().collect();

        refferential_actions.iter_mut().for_each(|action| {
            let base_pair_id = *base_pair_ids.get(&action.get_asset_id().0).unwrap();
            if base_pair_id == reference_asset_id.0 {
                return;
            }
            let rate = rates.pop_front().unwrap().unwrap();
            action.apply_refferential_price(rate.rate);
            tracing::trace!(
                "Dates: {:#?} {:#?}, {:#?} to {:?}",
                rate.date,
                action.date(),
                rate.rate,
                action
            );
        });

        let mut final_vec: Vec<Box<dyn PortfolioAction>> = Vec::new();
        for action in regular_actions {
            final_vec.push(action);
        }
        for action in refferential_actions {
            final_vec.push(action);
        }

        tracing::trace!("final_vec: {:#?}", final_vec);
        portfolio.process_transactions(final_vec);

        let mut asdasd: HashSet<AssetIdDto> = HashSet::new();
        portfolio.account_portfolios().iter().for_each(|a| {
            a.1.asset_portfolios.iter().for_each(|b| {
                asdasd.insert(AssetIdDto(*b.0));
            });
        });

        let current_rates = self
            .asset_rates_service
            .get_pairs_latest_converted(asdasd, reference_asset_id.clone())
            .await?;

        let current_rates: HashMap<AssetIdDto, Decimal> = current_rates
            .into_iter()
            .filter(|(ids, _)| ids.pair2 == reference_asset_id)
            .map(|(ids, rate)| (ids.pair1, rate.rate))
            .collect();

        let dto = portfolio.try_into_dto(current_rates)?;
        Ok(dto)
    }
}
