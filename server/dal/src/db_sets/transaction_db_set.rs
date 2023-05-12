use async_trait::async_trait;
use sea_query::{Alias, Expr, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::{types::Uuid, PgConnection};
use tracing::{debug_span, Instrument};

use crate::{
    idens::{
        portfolio_idens::PortfolioAccountIden,
        transaction_idens::{TransactionDescriptionsIden, TransactionGroupIden, TransactionIden, TransactionCategoriesIden},
    },
    models::transaction_models::{
        AddTransactionDescriptionModel, AddTransactionGroupModel, AddTransactionModel,
        TransactionWithGroupModel, CategoryModel,
    },
};

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
    async fn get_categories(
        &mut self,
    ) -> anyhow::Result<Vec<CategoryModel>>;
}

#[async_trait]
impl TransactionDbSet for PgConnection {
    #[tracing::instrument(skip(self), ret, err)]
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

        let rows = sqlx::query_as_with::<_, TransactionWithGroupModel, _>(&sql, values.clone())
            .fetch_all(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;

        Ok(rows)
    }

    #[tracing::instrument(skip(self), ret, err)]
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

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok({})
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn insert_transaction_group(
        &mut self,
        group: AddTransactionGroupModel,
    ) -> Result<(), anyhow::Error> {
        let (sql, values) = Query::insert()
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

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(())
    }

    #[tracing::instrument(skip(self), ret, err)]
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
        let (sql, values) = builder2.build_sqlx(PostgresQueryBuilder);

        let rows: Vec<i32> = sqlx::query_scalar_with(&sql, values.clone())
            .fetch_all(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(rows)
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn get_categories(
        &mut self,
    ) -> anyhow::Result<Vec<CategoryModel>> {
        let (sql, values) = Query::select()
            .column( TransactionCategoriesIden::Id)
            .column( TransactionCategoriesIden::Category)
            .column( TransactionCategoriesIden::Icon)
            .from(TransactionCategoriesIden::Table)
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, CategoryModel, _>(&sql, values.clone())
            .fetch_all(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;

        Ok(rows)
    }
}
