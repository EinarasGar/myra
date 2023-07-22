use async_trait::async_trait;
use sea_query::{Alias, Expr, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::{types::Uuid, PgConnection};
use tracing::{debug_span, Instrument};

use crate::{
    idens::{
        portfolio_idens::PortfolioAccountIden,
        transaction_idens::{
            TransactionCategoriesIden, TransactionDescriptionsIden, TransactionGroupIden,
            TransactionIden,
        },
    },
    models::transaction_models::{
        AddTransactionDescriptionModel, AddUpdateTransactionGroupModel, AddUpdateTransactionModel,
        CategoryModel, TransactionWithGroupModel,
    },
};

#[async_trait]
pub trait TransactionDbSet {
    async fn get_transactions(
        &mut self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<TransactionWithGroupModel>>;
    async fn get_transaction_group(
        &mut self,
        transaction_group_id: Uuid,
    ) -> anyhow::Result<Vec<TransactionWithGroupModel>>;
    async fn insert_descriptions(
        &mut self,
        models: Vec<AddTransactionDescriptionModel>,
    ) -> Result<(), anyhow::Error>;
    async fn insert_transaction_group(
        &mut self,
        group: AddUpdateTransactionGroupModel,
    ) -> anyhow::Result<()>;
    async fn insert_transactions(
        &mut self,
        models: Vec<AddUpdateTransactionModel>,
    ) -> Result<Vec<i32>, anyhow::Error>;
    async fn get_categories(&mut self) -> anyhow::Result<Vec<CategoryModel>>;
    async fn delete_transactions(&mut self, transaction_ids: Vec<i32>) -> anyhow::Result<()>;
    async fn delete_descriptions(&mut self, transaction_ids: Vec<i32>) -> anyhow::Result<()>;
    async fn update_group(
        &mut self,
        new_model: AddUpdateTransactionGroupModel,
    ) -> anyhow::Result<()>;
    async fn update_description(&mut self, id: i32, description: String) -> anyhow::Result<()>;
    async fn update_transaction(
        &mut self,
        id: i32,
        model: AddUpdateTransactionModel,
    ) -> anyhow::Result<()>;
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
    async fn get_transaction_group(
        &mut self,
        transaction_group_id: Uuid,
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
            .and_where(
                Expr::col((TransactionIden::Table, TransactionIden::GroupId))
                    .eq(transaction_group_id),
            )
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
        Ok(())
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn insert_transaction_group(
        &mut self,
        group: AddUpdateTransactionGroupModel,
    ) -> anyhow::Result<()> {
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
        models: Vec<AddUpdateTransactionModel>,
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
    async fn get_categories(&mut self) -> anyhow::Result<Vec<CategoryModel>> {
        let (sql, values) = Query::select()
            .column(TransactionCategoriesIden::Id)
            .column(TransactionCategoriesIden::Category)
            .column(TransactionCategoriesIden::Icon)
            .from(TransactionCategoriesIden::Table)
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, CategoryModel, _>(&sql, values.clone())
            .fetch_all(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;

        Ok(rows)
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn delete_transactions(&mut self, transaction_ids: Vec<i32>) -> anyhow::Result<()> {
        let (sql, values) = Query::delete()
            .from_table(TransactionIden::Table)
            .and_where(Expr::col(TransactionIden::Id).is_in(transaction_ids))
            .build_sqlx(PostgresQueryBuilder);

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(())
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn delete_descriptions(&mut self, transaction_ids: Vec<i32>) -> anyhow::Result<()> {
        let (sql, values) = Query::delete()
            .from_table(TransactionDescriptionsIden::Table)
            .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).is_in(transaction_ids))
            .build_sqlx(PostgresQueryBuilder);

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(())
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn update_group(
        &mut self,
        new_model: AddUpdateTransactionGroupModel,
    ) -> anyhow::Result<()> {
        let (sql, values) = Query::update()
            .table(TransactionGroupIden::Table)
            .value(TransactionGroupIden::CategoryId, new_model.category_id)
            .value(TransactionGroupIden::Description, new_model.description)
            .value(TransactionGroupIden::DateAdded, new_model.date)
            .and_where(Expr::col(TransactionGroupIden::TransactionGroupId).eq(new_model.group_id))
            .build_sqlx(PostgresQueryBuilder);

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(())
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn update_description(&mut self, id: i32, description: String) -> anyhow::Result<()> {
        let (sql, values) = Query::update()
            .table(TransactionDescriptionsIden::Table)
            .value(TransactionDescriptionsIden::Description, description)
            .and_where(Expr::col(TransactionDescriptionsIden::TransactionId).eq(id))
            .build_sqlx(PostgresQueryBuilder);

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(())
    }

    #[tracing::instrument(skip(self), ret, err)]
    async fn update_transaction(
        &mut self,
        id: i32,
        model: AddUpdateTransactionModel,
    ) -> anyhow::Result<()> {
        let (sql, values) = Query::update()
            .table(TransactionIden::Table)
            .value(TransactionIden::AccountId, model.account_id)
            .value(TransactionIden::AssetId, model.asset_id)
            .value(TransactionIden::CategoryId, model.category_id)
            .value(TransactionIden::Quantity, model.quantity)
            .value(TransactionIden::Date, model.date)
            .and_where(Expr::col(TransactionIden::Id).eq(id))
            .build_sqlx(PostgresQueryBuilder);

        sqlx::query_with(&sql, values.clone())
            .execute(&mut *self)
            .instrument(debug_span!("query", sql, ?values))
            .await?;
        Ok(())
    }
}
