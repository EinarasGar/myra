use dal::models::account_models::AccountWithMetadata;
use uuid::Uuid;

use super::{
    account_liquidity_type_dto::AccountLiquidityTypeDto, account_type_dto::AccountTypeDto,
};

pub struct FullAccountDto {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_name: String,
    pub account_type: AccountTypeDto,
    pub liquidity_type: AccountLiquidityTypeDto,
}

impl From<AccountWithMetadata> for FullAccountDto {
    fn from(account: AccountWithMetadata) -> Self {
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
        }
    }
}
