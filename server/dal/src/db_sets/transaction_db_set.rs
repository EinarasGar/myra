use async_trait::async_trait;
use sea_query::{Alias, Expr, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::PgConnection;
use uuid::Uuid;

use crate::{
    idens::{
        portfolio_idens::PortfolioAccountIden,
        transaction_idens::{TransactionDescriptionsIden, TransactionGroupIden, TransactionIden},
    },
    models::transaction_models::{
        AddTransactionDescriptionModel, AddTransactionGroupModel, AddTransactionModel,
        TransactionWithGroupModel,
    },
};

// async fn insert_transactions_and_group(
//     &self,
//     models: Vec<AddTransactionModel>,
//     group: AddTransactionGroupModel,
// ) -> anyhow::Result<Vec<i32>> {
//     //Start transaction
//     let mut sql_transaction = self.pool.begin().await?;

//     update_portfolio(&mut sql_transaction, &models).await?;

//     let rows = insert_transactions(&mut sql_transaction, &models).await?;

//     insert_transaction_group(&mut sql_transaction, group).await?;

//     insert_descriptions(&mut sql_transaction, &rows, models).await?;

//     sql_transaction.commit().await?;

//     anyhow::Ok(rows)
// }

#[async_trait]
pub trait TransactionDbSet {
    async fn get_transactions(
        &mut self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<TransactionWithGroupModel>>;
    async fn insert_descriptions(
        &mut self,
        models: Vec<AddTransactionDescriptionModel>,
    ) -> Result<(), anyhow::Error>;
    async fn insert_transaction_group(
        &mut self,
        group: AddTransactionGroupModel,
    ) -> Result<(), anyhow::Error>;
    async fn insert_transactions(
        &mut self,
        models: Vec<AddTransactionModel>,
    ) -> Result<Vec<i32>, anyhow::Error>;
}

#[async_trait]
impl TransactionDbSet for PgConnection {
    async fn get_transactions(
        &mut self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<TransactionWithGroupModel>> {
        let (sql, values) = Query::select()
            .column((TransactionIden::Table, TransactionIden::Id))
            .column((TransactionIden::Table, TransactionIden::UserId))
            .column((TransactionIden::Table, TransactionIden::GroupId))
            .column((TransactionIden::Table, TransactionIden::AssetId))
            .column((TransactionIden::Table, TransactionIden::AccountId))
            .column((TransactionIden::Table, TransactionIden::CategoryId))
            .column((TransactionIden::Table, TransactionIden::Quantity))
            .column((TransactionIden::Table, TransactionIden::Date))
            .column((
                TransactionDescriptionsIden::Table,
                TransactionDescriptionsIden::Description,
            ))
            .expr_as(
                Expr::col((
                    TransactionGroupIden::Table,
                    TransactionGroupIden::Description,
                )),
                Alias::new("group_description"),
            )
            .expr_as(
                Expr::col((
                    TransactionGroupIden::Table,
                    TransactionGroupIden::CategoryId,
                )),
                Alias::new("group_category_id"),
            )
            .expr_as(
                Expr::col((PortfolioAccountIden::Table, PortfolioAccountIden::Name)),
                Alias::new("account_name"),
            )
            .column((TransactionGroupIden::Table, TransactionGroupIden::DateAdded))
            .from(TransactionIden::Table)
            .left_join(
                TransactionDescriptionsIden::Table,
                Expr::col((TransactionIden::Table, TransactionIden::Id)).equals((
                    TransactionDescriptionsIden::Table,
                    TransactionDescriptionsIden::TransactionId,
                )),
            )
            .left_join(
                TransactionGroupIden::Table,
                Expr::col((TransactionIden::Table, TransactionIden::GroupId)).equals((
                    TransactionGroupIden::Table,
                    TransactionGroupIden::TransactionGroupId,
                )),
            )
            .left_join(
                PortfolioAccountIden::Table,
                Expr::col((TransactionIden::Table, TransactionIden::AccountId))
                    .equals((PortfolioAccountIden::Table, PortfolioAccountIden::Id)),
            )
            .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(user_id))
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, TransactionWithGroupModel, _>(&sql, values)
            .fetch_all(&mut *self)
            .await?;

        Ok(rows)
    }

    async fn insert_descriptions(
        &mut self,
        models: Vec<AddTransactionDescriptionModel>,
    ) -> Result<(), anyhow::Error> {
        let mut description_builder = Query::insert()
            .into_table(TransactionDescriptionsIden::Table)
            .columns([
                TransactionDescriptionsIden::TransactionId,
                TransactionDescriptionsIden::Description,
            ])
            .to_owned();

        for model in models.into_iter() {
            description_builder
                .values_panic(vec![model.transaction_id.into(), model.description.into()]);
        }

        let (sql, values) = description_builder.build_sqlx(PostgresQueryBuilder);
        sqlx::query_with(&sql, values).execute(&mut *self).await?;
        Ok({})
    }

    async fn insert_transaction_group(
        &mut self,
        group: AddTransactionGroupModel,
    ) -> Result<(), anyhow::Error> {
        let (sql3, values3) = Query::insert()
            .into_table(TransactionGroupIden::Table)
            .columns([
                TransactionGroupIden::TransactionGroupId,
                TransactionGroupIden::CategoryId,
                TransactionGroupIden::Description,
                TransactionGroupIden::DateAdded,
            ])
            .values_panic(vec![
                group.group_id.into(),
                group.category_id.into(),
                group.description.into(),
                group.date.into(),
            ])
            .build_sqlx(PostgresQueryBuilder);
        sqlx::query_with(&sql3, values3).execute(&mut *self).await?;
        Ok(())
    }

    async fn insert_transactions(
        &mut self,
        models: Vec<AddTransactionModel>,
    ) -> Result<Vec<i32>, anyhow::Error> {
        let mut builder2 = Query::insert()
            .into_table(TransactionIden::Table)
            .columns([
                TransactionIden::UserId,
                TransactionIden::GroupId,
                TransactionIden::AssetId,
                TransactionIden::AccountId,
                TransactionIden::CategoryId,
                TransactionIden::Quantity,
                TransactionIden::Date,
            ])
            .returning_col(TransactionIden::Id)
            .to_owned();
        for model in models.into_iter() {
            // where items is a vec of row's values
            builder2.values_panic(vec![
                model.user_id.into(),
                model.group_id.into(),
                model.asset_id.into(),
                model.account_id.into(),
                model.category_id.into(),
                model.quantity.into(),
                model.date.into(),
            ]);
        }
        let (sql2, values2) = builder2.build_sqlx(PostgresQueryBuilder);
        let rows: Vec<i32> = sqlx::query_scalar_with(&sql2, values2)
            .fetch_all(&mut *self)
            .await?;
        Ok(rows)
    }
}
