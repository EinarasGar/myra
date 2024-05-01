use sea_query::{PostgresQueryBuilder, Query};
use sea_query_binder::SqlxBinder;

use crate::{idens::entries_idens::EntryIden, models::add_entry_model::AddEntryModel};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn insert_entries(models: Vec<AddEntryModel>) -> DbQueryWithValues {
    let mut builder2 = Query::insert()
        .into_table(EntryIden::Table)
        .columns([
            EntryIden::AssetId,
            EntryIden::AccountId,
            EntryIden::Quantity,
            EntryIden::CategoryId,
            EntryIden::TransactionId,
        ])
        .returning_col(EntryIden::Id)
        .to_owned();
    for model in models.into_iter() {
        builder2.values_panic(vec![
            model.asset_id.into(),
            model.account_id.into(),
            model.quantity.into(),
            model.category_id.into(),
            model.transaction_id.into(),
        ]);
    }
    builder2.build_sqlx(PostgresQueryBuilder).into()
}
