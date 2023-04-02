use sea_query::{Alias, Expr, OnConflict, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::{
    idens::{
        portfolio_idens::PortfolioIden,
        transaction_idens::{TransactionDescriptionsIden, TransactionGroupIden, TransactionIden},
        CommonsIden,
    },
    models::transaction_models::{
        AddTransactionGroupModel, AddTransactionModel, TransactionWithGroupModel,
    },
};

#[derive(Clone)]
pub struct TransactionDbSet {
    pool: Pool<Postgres>,
}

impl TransactionDbSet {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn insert_transactions_and_group(
        &self,
        models: Vec<AddTransactionModel>,
        group: AddTransactionGroupModel,
    ) -> anyhow::Result<Vec<i32>> {
        //Start transaction
        let mut sql_transaction = self.pool.begin().await?;

        //Update portfolio table
        let mut builder = Query::insert()
            .into_table(PortfolioIden::Table)
            .columns([
                PortfolioIden::UserId,
                PortfolioIden::AssetId,
                PortfolioIden::Sum,
            ])
            .on_conflict(
                OnConflict::columns([PortfolioIden::UserId, PortfolioIden::AssetId])
                    .value(
                        PortfolioIden::Sum,
                        //I dont like this what so ever, but sea-query doesnt have a better way to do it
                        Expr::col((PortfolioIden::Table, PortfolioIden::Sum))
                            .add(Expr::col((CommonsIden::Excluded, PortfolioIden::Sum))),
                    )
                    .to_owned(),
            )
            .to_owned();

        for model in models.clone().into_iter() {
            // where items is a vec of row's values
            builder.values_panic(vec![
                model.user_id.into(),
                model.asset_id.into(),
                model.quantity.into(),
            ]);
        }

        let (sql, values) = builder.build_sqlx(PostgresQueryBuilder);
        sqlx::query_with(&sql, values)
            .execute(&mut sql_transaction)
            .await?;

        //Insert new transactions
        let mut builder2 = Query::insert()
            .into_table(TransactionIden::Table)
            .columns([
                TransactionIden::UserId,
                TransactionIden::GroupId,
                TransactionIden::AssetId,
                TransactionIden::CategoryId,
                TransactionIden::Quantity,
                TransactionIden::Date,
            ])
            .returning_col(TransactionIden::Id)
            .to_owned();

        for model in models.clone().into_iter() {
            // where items is a vec of row's values
            builder2.values_panic(vec![
                model.user_id.into(),
                model.group_id.into(),
                model.asset_id.into(),
                model.category_id.into(),
                model.quantity.into(),
                model.date.into(),
            ]);
        }

        let (sql2, values2) = builder2.build_sqlx(PostgresQueryBuilder);
        let rows: Vec<i32> = sqlx::query_scalar_with(&sql2, values2)
            .fetch_all(&mut sql_transaction)
            .await?;

        //Insert transaction group
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

        sqlx::query_with(&sql3, values3)
            .execute(&mut sql_transaction)
            .await?;

        //Insert transcation descriptions
        let mut some_description_exists = false;
        let mut new_transcation_ids = rows.clone();
        let mut description_builder = Query::insert()
            .into_table(TransactionDescriptionsIden::Table)
            .columns([
                TransactionDescriptionsIden::TransactionId,
                TransactionDescriptionsIden::Description,
            ])
            .to_owned();

        for model in models.clone().into_iter() {
            let trans_id = new_transcation_ids
                .pop()
                .expect("Rows returned from insertion are less than what we passed");

            if model.description.is_some() {
                description_builder.values_panic(vec![trans_id.into(), model.description.into()]);
                some_description_exists = true;
            }
        }

        if some_description_exists {
            let (description_sql, description_values) =
                description_builder.build_sqlx(PostgresQueryBuilder);
            sqlx::query_with(&description_sql, description_values)
                .execute(&mut sql_transaction)
                .await?;
        }

        sql_transaction.commit().await?;

        anyhow::Ok(rows)
    }

    pub async fn get_transactions(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<Vec<TransactionWithGroupModel>> {
        let (sql, values) = Query::select()
            .column((TransactionIden::Table, TransactionIden::Id))
            .column((TransactionIden::Table, TransactionIden::UserId))
            .column((TransactionIden::Table, TransactionIden::GroupId))
            .column((TransactionIden::Table, TransactionIden::AssetId))
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
            .and_where(Expr::col((TransactionIden::Table, TransactionIden::UserId)).eq(user_id))
            .build_sqlx(PostgresQueryBuilder);

        let rows = sqlx::query_as_with::<_, TransactionWithGroupModel, _>(&sql, values)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows)
    }
}

// #[cfg(test)]
// mod tests {
//     use std::str::FromStr;

//     use time::macros::datetime;
//     use uuid::Uuid;

//     use crate::{database_context, models::transaction_models::TransactionWithGroupModel};
//     use rust_decimal_macros::dec;

//     #[tokio::test]
//     async fn test_get_user_counttt() {
//         //arrange
//         let context = database_context::MyraDb::new().await.unwrap();

//         let group_id = Uuid::new_v4();

//         let model1 = TransactionWithGroupModel {
//             id: 1,
//             user_id: Uuid::from_str("2396480f-0052-4cf0-81dc-8cedbde5ce13").unwrap(),
//             group_id: group_id,
//             asset_id: 1,
//             category_id: 1,
//             quantity: dec!(-1000),
//             date: datetime!(2020-01-01 0:00 UTC),
//             description: None,
//             group_description: None,
//         };

//         let model2 = TransactionWithGroupModel {
//             id: 1,
//             user_id: Uuid::from_str("2396480f-0052-4cf0-81dc-8cedbde5ce13").unwrap(),
//             group_id: group_id,
//             asset_id: 2,
//             category_id: 1,
//             quantity: dec!(1123788787785.12154234123),
//             date: datetime!(2020-01-01 0:00 UTC),
//             description: None,
//             group_description: None,
//         };

//         //act
//         context
//             .transactions_db_set
//             .insert_transactions(vec![model1, model2])
//             .await
//             .unwrap();
//     }
// }
