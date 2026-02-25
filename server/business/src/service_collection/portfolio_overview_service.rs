use std::collections::{HashMap, HashSet};

#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::models::portfolio_models::Holding;
use dal::models::transaction_models::TransactionWithEntriesModel;
use dal::queries::{entries_queries, transaction_queries};
use dal::query_params::get_transaction_with_entries_params::GetTransactionWithEntriesParams;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::dtos::asset_id_date_dto::AssetIdDateDto;
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
use super::transaction_metadata_service::TransactionMetadataService;
#[mockall_double::double]
use super::transaction_service::TransactionService;

pub struct PortfolioOverviewService {
    #[allow(dead_code)]
    db: MyraDb,
    _transaction_service: TransactionService,
    asset_rates_service: AssetRatesService,
    transaction_metadata_service: TransactionMetadataService,
}

impl PortfolioOverviewService {
    pub fn new(db: MyraDb) -> Self {
        Self {
            db: db.clone(),
            _transaction_service: TransactionService::new(db.clone()),
            asset_rates_service: AssetRatesService::new(db.clone()),
            transaction_metadata_service: TransactionMetadataService::new(db.clone()),
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
        let query_params = GetTransactionWithEntriesParams::by_user_id_with_ownership(user_id);

        let query = transaction_queries::get_transaction_with_entries(query_params);
        let models = self
            .db
            .fetch_all::<TransactionWithEntriesModel>(query)
            .await?;

        tracing::trace!("Got transactions: {:#?}", models);
        let mut transactions: Vec<Transaction> =
            create_transactions_from_transaction_with_entries_models(models)?;

        self.transaction_metadata_service
            .load_metadata(&mut transactions)
            .await?;

        let mut portfolio = Portfolio::new();

        let mut regular_actions: Vec<Box<dyn PortfolioAction>> = Vec::new();
        let mut referential_actions: Vec<Box<dyn ReferentialPortfolioAction>> = Vec::new();

        for transaction in transactions {
            let portfolio_action = transaction.get_portfolio_action()?;
            match portfolio_action {
                TransactionPortfolioAction::None => {}
                TransactionPortfolioAction::Regular(portfolio_action) => {
                    regular_actions.push(portfolio_action)
                }
                TransactionPortfolioAction::Referential(referential_portfolio_action) => {
                    referential_actions.push(referential_portfolio_action)
                }
            }
        }

        let asset_id_dates: Vec<AssetIdDateDto> = referential_actions
            .iter()
            .filter_map(|action| {
                let cash_asset_id = action.get_conversion_asset_id().0;
                if cash_asset_id == reference_asset_id.0 {
                    return None;
                }
                Some(AssetIdDateDto {
                    asset_id: cash_asset_id,
                    date: action.date(),
                })
            })
            .collect();

        let rates = self
            .asset_rates_service
            .get_pairs_by_dates_converted(asset_id_dates, reference_asset_id.clone())
            .await?;

        let mut rate_iter = rates.into_iter();
        for action in &mut referential_actions {
            let cash_asset_id = action.get_conversion_asset_id().0;
            if cash_asset_id == reference_asset_id.0 {
                continue;
            }
            let rate = rate_iter.next().unwrap().unwrap();
            action.apply_conversion_rate(rate.rate);
            tracing::trace!(
                "Dates: {:#?} {:#?}, {:#?} to {:?}",
                rate.date,
                action.date(),
                rate.rate,
                action
            );
        }

        let mut final_vec: Vec<Box<dyn PortfolioAction>> = regular_actions;
        final_vec.extend(
            referential_actions
                .into_iter()
                .map(|a| a as Box<dyn PortfolioAction>),
        );

        tracing::trace!("final_vec: {:#?}", final_vec);
        portfolio.process_transactions(final_vec);

        let held_asset_ids: HashSet<AssetIdDto> = portfolio
            .account_portfolios()
            .iter()
            .flat_map(|(_, ap)| ap.asset_portfolios.keys().map(|id| AssetIdDto(*id)))
            .collect();

        let current_rates = self
            .asset_rates_service
            .get_pairs_latest_converted(held_asset_ids, reference_asset_id.clone())
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
