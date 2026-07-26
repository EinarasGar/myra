use dal::models::account_models::AccountWithMetadata;
use rust_decimal::Decimal;
use uuid::Uuid;

use super::{
    account_identifier_dto::AccountIdentifierDto,
    account_liquidity_type_dto::AccountLiquidityTypeDto, account_type_dto::AccountTypeDto,
    suggested_currency_dto::SuggestedCurrencyDto,
};

pub struct FullAccountDto {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_name: String,
    pub account_type: AccountTypeDto,
    pub liquidity_type: AccountLiquidityTypeDto,
    pub ownership_share: Decimal,
    pub identifiers: Vec<AccountIdentifierDto>,
    pub suggested_currency: Option<SuggestedCurrencyDto>,
}

impl From<AccountWithMetadata> for FullAccountDto {
    fn from(account: AccountWithMetadata) -> Self {
        let suggested_currency = match (
            account.suggested_currency_id,
            account.suggested_currency_ticker,
            account.suggested_currency_name,
            account.suggested_currency_type,
        ) {
            (Some(id), Some(ticker), Some(name), Some(asset_type)) => Some(SuggestedCurrencyDto {
                id,
                ticker,
                name,
                asset_type,
            }),
            _ => None,
        };

        Self {
            id: account.id,
            user_id: account.user_id,
            account_name: account.account_name,
            account_type: AccountTypeDto {
                id: account.account_type,
                name: account.account_type_name,
            },
            liquidity_type: AccountLiquidityTypeDto {
                id: account.liquidity_type,
                name: account.liquidity_type_name,
            },
            ownership_share: account.ownership_share,
            identifiers: Vec::new(),
            suggested_currency,
        }
    }
}
