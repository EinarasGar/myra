use std::collections::HashSet;

#[mockall_double::double]
use dal::database_context::MyraDb;
use dal::{
    models::account_model::{
        Account, AccountCreationModel, AccountLiquidityTypeModel, AccountTypeModel,
        AccountUpdateModel, AccountWithMetadata,
    },
    queries::account_queries,
    query_params::get_accounts_params::GetAccountsParams,
};
use itertools::Itertools;
use mockall::automock;
use uuid::Uuid;

use crate::dtos::accounts::{
    account_amendment_dto::AccountAmendmentDto, account_dto::AccountDto,
    account_liquidity_type_dto::AccountLiquidityTypeDto, account_type_dto::AccountTypeDto,
    full_account_dto::FullAccountDto,
};

pub struct AccountsService {
    db: MyraDb,
}

#[automock]
impl AccountsService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_account_with_metadata(&self, id: Uuid) -> anyhow::Result<FullAccountDto> {
        let query = account_queries::get_accounts(GetAccountsParams::by_id_with_metadata(id));
        let model = self.db.fetch_optional::<AccountWithMetadata>(query).await?;

        if let Some(model) = model {
            return Ok(model.into());
        } else {
            return Err(anyhow::anyhow!("Account not found"));
        }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_accounts(&self, id: HashSet<Uuid>) -> anyhow::Result<Vec<AccountDto>> {
        let query = account_queries::get_accounts(GetAccountsParams::by_ids(id));
        let model = self.db.fetch_all::<Account>(query).await?;
        let ret = model.into_iter().map_into().collect();
        Ok(ret)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_user_accounts_with_metadata(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<FullAccountDto>> {
        let query =
            account_queries::get_accounts(GetAccountsParams::by_user_id_with_metadata(user_id));
        let model = self.db.fetch_all::<AccountWithMetadata>(query).await?;
        let ret = model.into_iter().map_into().collect();
        Ok(ret)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn update_user_account(
        &self,
        user_id: Uuid,
        account_id: Uuid,
        amendment: AccountAmendmentDto,
    ) -> anyhow::Result<()> {
        let model = AccountUpdateModel {
            account_id,
            user_id,
            account_name: amendment.account_name,
            account_type: amendment.account_type,
            liquidity_type: amendment.account_liquidity_type,
        };

        let query = account_queries::update_account(model);
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn add_user_account(
        &self,
        user_id: Uuid,
        amendment: AccountAmendmentDto,
    ) -> anyhow::Result<Uuid> {
        let model = AccountCreationModel {
            user_id,
            account_name: amendment.account_name,
            account_type: amendment.account_type,
            liquidity_type: amendment.account_liquidity_type,
        };

        let query = account_queries::insert_account(model);
        let new_id: Uuid = self.db.fetch_one_scalar(query).await?;
        Ok(new_id)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn deactivate_user_account(
        &self,
        user_id: Uuid,
        account_id: Uuid,
    ) -> anyhow::Result<()> {
        let query = account_queries::deactivate_account(user_id, account_id);
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_account_types(&self) -> anyhow::Result<Vec<AccountTypeDto>> {
        let query = account_queries::get_account_types();
        let models = self.db.fetch_all::<AccountTypeModel>(query).await?;
        let return_models = models.into_iter().map_into().collect();
        Ok(return_models)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_account_liquidity_types(
        &self,
    ) -> anyhow::Result<Vec<AccountLiquidityTypeDto>> {
        let query = account_queries::get_account_liquidity_types();
        let models = self
            .db
            .fetch_all::<AccountLiquidityTypeModel>(query)
            .await?;
        let return_models = models.into_iter().map_into().collect();
        Ok(return_models)
    }
}
