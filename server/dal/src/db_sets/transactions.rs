use sea_query::{Expr, OnConflict, PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;
use sqlx::{Pool, Postgres};

use crate::{
    idens::{portfolio::PortfolioIden, transaction::TransactionIden, CommonsIden},
    models::transaction::TransactionModel,
};

#[derive(Clone)]
pub struct TransactionDbSet {
    pool: Pool<Postgres>,
}

impl TransactionDbSet {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn insert_transactions(
        &self,
        models: Vec<TransactionModel>,
    ) -> anyhow::Result<Vec<i32>> {
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

        let sql_transaction = self.pool.begin().await?;
        sqlx::query_with(&sql, values).execute(&self.pool).await?;

        let rows: Vec<i32> = sqlx::query_scalar_with(&sql2, values2)
            .fetch_all(&self.pool)
            .await?;

        sql_transaction.commit().await?;

        anyhow::Ok(rows)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use time::macros::datetime;
    use uuid::Uuid;

    use crate::{database_context, models::transaction::TransactionModel};
    use rust_decimal_macros::dec;

    #[tokio::test]
    async fn test_get_user_counttt() {
        //arrange
        let context = database_context::MyraDb::new().await.unwrap();

        let group_id = Uuid::new_v4();

        let model1 = TransactionModel {
            id: 1,
            user_id: Uuid::from_str("2396480f-0052-4cf0-81dc-8cedbde5ce13").unwrap(),
            group_id: group_id,
            asset_id: 1,
            category_id: 1,
            quantity: dec!(-1000),
            date: datetime!(2020-01-01 0:00),
        };

        let model2 = TransactionModel {
            id: 1,
            user_id: Uuid::from_str("2396480f-0052-4cf0-81dc-8cedbde5ce13").unwrap(),
            group_id: group_id,
            asset_id: 2,
            category_id: 1,
            quantity: dec!(1123788787785.12154234123),
            date: datetime!(2020-01-01 0:00),
        };

        //act
        context
            .transactions_db_set
            .insert_transactions(vec![model1, model2])
            .await
            .unwrap();
    }
}
