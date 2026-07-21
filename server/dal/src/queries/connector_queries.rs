use sea_query::{Alias, Expr, ExprTrait, OnConflict, PostgresQueryBuilder, Query, SelectStatement};
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use super::DbQueryWithValues;
use crate::{
    idens::connector_idens::{
        ConnectorBindingIden, ConnectorConnectionIden, ConnectorProviderAccountIden,
        ConnectorProviderIden, ConnectorRawPageIden, ConnectorTransactionIden,
    },
    models::connector_models::{
        AddConnectorBindingModel, AddConnectorConnectionModel, AddConnectorProviderAccountModel,
        AddConnectorRawPageModel, AddConnectorTransactionModel,
        UpdateProviderAccountSyncResultModel,
    },
    query_params::connector_params::{
        GetConnectorBindingsParams, GetConnectorBindingsParamsSearchType,
        GetConnectorConnectionsParams, GetConnectorConnectionsParamsSearchType,
    },
};

#[macros::named_query]
pub fn get_connector_provider_id_by_kind(kind: String) -> DbQueryWithValues {
    Query::select()
        .column((ConnectorProviderIden::Table, ConnectorProviderIden::Id))
        .from(ConnectorProviderIden::Table)
        .and_where(Expr::col((ConnectorProviderIden::Table, ConnectorProviderIden::Kind)).eq(kind))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

/// Bindings owned by `user_id`, resolved through `binding → provider_account → connection`.
fn owned_binding_ids_subquery(user_id: Uuid) -> SelectStatement {
    Query::select()
        .column((ConnectorBindingIden::Table, ConnectorBindingIden::Id))
        .from(ConnectorBindingIden::Table)
        .inner_join(
            ConnectorProviderAccountIden::Table,
            Expr::col((
                ConnectorBindingIden::Table,
                ConnectorBindingIden::ProviderAccountId,
            ))
            .equals((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::Id,
            )),
        )
        .inner_join(
            ConnectorConnectionIden::Table,
            Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::ConnectionId,
            ))
            .equals((ConnectorConnectionIden::Table, ConnectorConnectionIden::Id)),
        )
        .and_where(
            Expr::col((
                ConnectorConnectionIden::Table,
                ConnectorConnectionIden::UserId,
            ))
            .eq(user_id),
        )
        .to_owned()
}

#[macros::named_query]
pub fn insert_connector_connection(model: AddConnectorConnectionModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(ConnectorConnectionIden::Table)
        .columns(vec![
            ConnectorConnectionIden::UserId,
            ConnectorConnectionIden::ProviderId,
            ConnectorConnectionIden::CredentialMode,
            ConnectorConnectionIden::ProviderKeyId,
            ConnectorConnectionIden::Status,
            ConnectorConnectionIden::ConsentExpiresAt,
        ])
        .values_panic([
            model.user_id.into(),
            model.provider_id.into(),
            model.credential_mode.into(),
            model.provider_key_id.into(),
            model.status.into(),
            model.consent_expires_at.into(),
        ])
        .returning_col(ConnectorConnectionIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_connector_connections(params: GetConnectorConnectionsParams) -> DbQueryWithValues {
    let mut query = Query::select()
        .column((ConnectorConnectionIden::Table, ConnectorConnectionIden::Id))
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::UserId,
        ))
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::ProviderId,
        ))
        .expr_as(
            Expr::col((ConnectorProviderIden::Table, ConnectorProviderIden::Kind)),
            Alias::new("provider_kind"),
        )
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::CredentialMode,
        ))
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::ProviderKeyId,
        ))
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::Status,
        ))
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::ConsentExpiresAt,
        ))
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::CreatedAt,
        ))
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::UpdatedAt,
        ))
        .from(ConnectorConnectionIden::Table)
        .inner_join(
            ConnectorProviderIden::Table,
            Expr::col((
                ConnectorConnectionIden::Table,
                ConnectorConnectionIden::ProviderId,
            ))
            .equals((ConnectorProviderIden::Table, ConnectorProviderIden::Id)),
        )
        .to_owned();

    query.and_where(
        Expr::col((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::UserId,
        ))
        .eq(params.user_id),
    );

    match params.search_type {
        GetConnectorConnectionsParamsSearchType::ById(id) => {
            query.and_where(
                Expr::col((ConnectorConnectionIden::Table, ConnectorConnectionIden::Id)).eq(id),
            );
        }
        GetConnectorConnectionsParamsSearchType::All => {}
    };

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[macros::named_query]
pub fn update_connector_connection_status(
    user_id: Uuid,
    connection_id: Uuid,
    status: String,
) -> DbQueryWithValues {
    Query::update()
        .table(ConnectorConnectionIden::Table)
        .value(ConnectorConnectionIden::Status, status)
        .and_where(
            Expr::col((
                ConnectorConnectionIden::Table,
                ConnectorConnectionIden::UserId,
            ))
            .eq(user_id),
        )
        .and_where(
            Expr::col((ConnectorConnectionIden::Table, ConnectorConnectionIden::Id))
                .eq(connection_id),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn activate_connector_connection(
    user_id: Uuid,
    connection_id: Uuid,
    consent_expires_at: Option<time::OffsetDateTime>,
) -> DbQueryWithValues {
    Query::update()
        .table(ConnectorConnectionIden::Table)
        .value(ConnectorConnectionIden::Status, "active")
        .value(
            ConnectorConnectionIden::ConsentExpiresAt,
            consent_expires_at,
        )
        .and_where(
            Expr::col((
                ConnectorConnectionIden::Table,
                ConnectorConnectionIden::UserId,
            ))
            .eq(user_id),
        )
        .and_where(
            Expr::col((ConnectorConnectionIden::Table, ConnectorConnectionIden::Id))
                .eq(connection_id),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_or_create_provider_account(
    model: AddConnectorProviderAccountModel,
) -> DbQueryWithValues {
    Query::insert()
        .into_table(ConnectorProviderAccountIden::Table)
        .columns(vec![
            ConnectorProviderAccountIden::ConnectionId,
            ConnectorProviderAccountIden::ExternalAccountId,
        ])
        .values_panic([model.connection_id.into(), model.external_account_id.into()])
        .on_conflict(
            OnConflict::columns([
                ConnectorProviderAccountIden::ConnectionId,
                ConnectorProviderAccountIden::ExternalAccountId,
            ])
            .value(ConnectorProviderAccountIden::UpdatedAt, Expr::cust("now()"))
            .to_owned(),
        )
        .returning_col(ConnectorProviderAccountIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn insert_connector_binding(model: AddConnectorBindingModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(ConnectorBindingIden::Table)
        .columns(vec![
            ConnectorBindingIden::ProviderAccountId,
            ConnectorBindingIden::SvertoAccountId,
            ConnectorBindingIden::WriteMode,
            ConnectorBindingIden::Status,
        ])
        .values_panic([
            model.provider_account_ref.into(),
            model.sverto_account_id.into(),
            model.write_mode.into(),
            model.status.into(),
        ])
        .returning_col(ConnectorBindingIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_connector_bindings(params: GetConnectorBindingsParams) -> DbQueryWithValues {
    let mut query = Query::select()
        .column((ConnectorBindingIden::Table, ConnectorBindingIden::Id))
        .expr_as(
            Expr::col((
                ConnectorBindingIden::Table,
                ConnectorBindingIden::ProviderAccountId,
            )),
            Alias::new("provider_account_ref"),
        )
        .column((
            ConnectorProviderAccountIden::Table,
            ConnectorProviderAccountIden::ConnectionId,
        ))
        .column((
            ConnectorBindingIden::Table,
            ConnectorBindingIden::SvertoAccountId,
        ))
        .expr_as(
            Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::ExternalAccountId,
            )),
            Alias::new("provider_account_id"),
        )
        .column((ConnectorBindingIden::Table, ConnectorBindingIden::WriteMode))
        .column((ConnectorBindingIden::Table, ConnectorBindingIden::Status))
        .column((
            ConnectorProviderAccountIden::Table,
            ConnectorProviderAccountIden::SyncedThrough,
        ))
        .column((
            ConnectorBindingIden::Table,
            ConnectorBindingIden::ProjectedPageId,
        ))
        .column((
            ConnectorProviderAccountIden::Table,
            ConnectorProviderAccountIden::LastSyncAt,
        ))
        .column((
            ConnectorProviderAccountIden::Table,
            ConnectorProviderAccountIden::LastSyncStatus,
        ))
        .column((
            ConnectorProviderAccountIden::Table,
            ConnectorProviderAccountIden::LastSyncError,
        ))
        .column((ConnectorBindingIden::Table, ConnectorBindingIden::CreatedAt))
        .column((ConnectorBindingIden::Table, ConnectorBindingIden::UpdatedAt))
        .from(ConnectorBindingIden::Table)
        .inner_join(
            ConnectorProviderAccountIden::Table,
            Expr::col((
                ConnectorBindingIden::Table,
                ConnectorBindingIden::ProviderAccountId,
            ))
            .equals((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::Id,
            )),
        )
        .inner_join(
            ConnectorConnectionIden::Table,
            Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::ConnectionId,
            ))
            .equals((ConnectorConnectionIden::Table, ConnectorConnectionIden::Id)),
        )
        .to_owned();

    query.and_where(
        Expr::col((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::UserId,
        ))
        .eq(params.user_id),
    );

    match params.search_type {
        GetConnectorBindingsParamsSearchType::ById(id) => {
            query.and_where(
                Expr::col((ConnectorBindingIden::Table, ConnectorBindingIden::Id)).eq(id),
            );
        }
        GetConnectorBindingsParamsSearchType::All => {}
    };

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[macros::named_query]
pub fn get_active_stored_bindings(limit: i64) -> DbQueryWithValues {
    Query::select()
        .column((ConnectorBindingIden::Table, ConnectorBindingIden::Id))
        .column((
            ConnectorConnectionIden::Table,
            ConnectorConnectionIden::UserId,
        ))
        .from(ConnectorBindingIden::Table)
        .inner_join(
            ConnectorProviderAccountIden::Table,
            Expr::col((
                ConnectorBindingIden::Table,
                ConnectorBindingIden::ProviderAccountId,
            ))
            .equals((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::Id,
            )),
        )
        .inner_join(
            ConnectorConnectionIden::Table,
            Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::ConnectionId,
            ))
            .equals((ConnectorConnectionIden::Table, ConnectorConnectionIden::Id)),
        )
        .and_where(
            Expr::col((
                ConnectorConnectionIden::Table,
                ConnectorConnectionIden::CredentialMode,
            ))
            .eq("stored"),
        )
        .and_where(
            Expr::col((ConnectorBindingIden::Table, ConnectorBindingIden::Status)).eq("active"),
        )
        .order_by_with_nulls(
            (
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::LastSyncAt,
            ),
            sea_query::Order::Asc,
            sea_query::NullOrdering::First,
        )
        .limit(limit as u64)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn update_connector_binding(
    user_id: Uuid,
    binding_id: Uuid,
    write_mode: Option<String>,
    status: String,
) -> DbQueryWithValues {
    let mut query = Query::update();
    query
        .table(ConnectorBindingIden::Table)
        .value(ConnectorBindingIden::Status, status)
        .and_where(
            Expr::col((ConnectorBindingIden::Table, ConnectorBindingIden::Id))
                .in_subquery(owned_binding_ids_subquery(user_id)),
        )
        .and_where(
            Expr::col((ConnectorBindingIden::Table, ConnectorBindingIden::Id)).eq(binding_id),
        );

    if let Some(write_mode) = write_mode {
        query.value(ConnectorBindingIden::WriteMode, write_mode);
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

/// Records a fetch outcome on the provider account (the fetch unit) and releases its claim.
#[macros::named_query]
pub fn update_provider_account_sync_result(
    model: UpdateProviderAccountSyncResultModel,
) -> DbQueryWithValues {
    let mut query = Query::update();
    query
        .table(ConnectorProviderAccountIden::Table)
        .value(
            ConnectorProviderAccountIden::LastSyncStatus,
            model.last_sync_status,
        )
        .value(
            ConnectorProviderAccountIden::LastSyncError,
            model.last_sync_error,
        )
        .value(ConnectorProviderAccountIden::LastSyncAt, model.last_sync_at)
        .value(
            ConnectorProviderAccountIden::SyncClaimedAt,
            sea_query::Value::from(None::<time::OffsetDateTime>),
        )
        .and_where(
            Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::Id,
            ))
            .eq(model.provider_account_ref),
        );

    if let Some(synced_through) = model.synced_through {
        query.value(ConnectorProviderAccountIden::SyncedThrough, synced_through);
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

/// Advances a binding's projection checkpoint after a committed projection.
#[macros::named_query]
pub fn update_binding_projection(
    binding_id: Uuid,
    projected_page_id: Option<Uuid>,
) -> DbQueryWithValues {
    Query::update()
        .table(ConnectorBindingIden::Table)
        .value(ConnectorBindingIden::ProjectedPageId, projected_page_id)
        .and_where(
            Expr::col((ConnectorBindingIden::Table, ConnectorBindingIden::Id)).eq(binding_id),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

/// Claims a provider account for a fetch walk (single-flight). Zero rows affected means
/// another fetch holds the claim; stale claims expire after `expiry_minutes`.
#[macros::named_query]
pub fn claim_provider_account_for_fetch(
    provider_account_ref: Uuid,
    expiry_minutes: i64,
) -> DbQueryWithValues {
    Query::update()
        .table(ConnectorProviderAccountIden::Table)
        .value(
            ConnectorProviderAccountIden::SyncClaimedAt,
            Expr::cust("now()"),
        )
        .and_where(
            Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::Id,
            ))
            .eq(provider_account_ref),
        )
        .and_where(
            Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::SyncClaimedAt,
            ))
            .is_null()
            .or(Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::SyncClaimedAt,
            ))
            .lt(Expr::cust_with_values(
                "now() - make_interval(mins => $1::int)",
                [expiry_minutes],
            ))),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn release_provider_account_fetch_claim(provider_account_ref: Uuid) -> DbQueryWithValues {
    Query::update()
        .table(ConnectorProviderAccountIden::Table)
        .value(
            ConnectorProviderAccountIden::SyncClaimedAt,
            sea_query::Value::from(None::<time::OffsetDateTime>),
        )
        .and_where(
            Expr::col((
                ConnectorProviderAccountIden::Table,
                ConnectorProviderAccountIden::Id,
            ))
            .eq(provider_account_ref),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_connector_transactions_by_external_ids(
    binding_id: Uuid,
    external_ids: Vec<String>,
) -> DbQueryWithValues {
    Query::select()
        .column((
            ConnectorTransactionIden::Table,
            ConnectorTransactionIden::TransactionId,
        ))
        .column((
            ConnectorTransactionIden::Table,
            ConnectorTransactionIden::ExternalId,
        ))
        .column((
            ConnectorTransactionIden::Table,
            ConnectorTransactionIden::ExternalHash,
        ))
        .column((
            ConnectorTransactionIden::Table,
            ConnectorTransactionIden::EditedByUser,
        ))
        .from(ConnectorTransactionIden::Table)
        .and_where(
            Expr::col((
                ConnectorTransactionIden::Table,
                ConnectorTransactionIden::BindingId,
            ))
            .eq(binding_id),
        )
        .and_where(
            Expr::col((
                ConnectorTransactionIden::Table,
                ConnectorTransactionIden::ExternalId,
            ))
            .is_in(external_ids),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn mark_connector_transactions_edited(transaction_ids: Vec<Uuid>) -> DbQueryWithValues {
    Query::update()
        .table(ConnectorTransactionIden::Table)
        .value(ConnectorTransactionIden::EditedByUser, true)
        .and_where(
            Expr::col((
                ConnectorTransactionIden::Table,
                ConnectorTransactionIden::TransactionId,
            ))
            .is_in(transaction_ids),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn insert_connector_transactions(
    models: Vec<AddConnectorTransactionModel>,
) -> DbQueryWithValues {
    let mut query = Query::insert()
        .into_table(ConnectorTransactionIden::Table)
        .columns(vec![
            ConnectorTransactionIden::BindingId,
            ConnectorTransactionIden::TransactionId,
            ConnectorTransactionIden::ExternalId,
            ConnectorTransactionIden::ExternalHash,
        ])
        .to_owned();
    for model in models {
        query.values_panic([
            model.binding_id.into(),
            model.transaction_id.into(),
            model.external_id.into(),
            model.external_hash.into(),
        ]);
    }
    query.build_sqlx(PostgresQueryBuilder).into()
}

#[macros::named_query]
pub fn insert_raw_page(model: AddConnectorRawPageModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(ConnectorRawPageIden::Table)
        .columns(vec![
            ConnectorRawPageIden::ProviderAccountId,
            ConnectorRawPageIden::Stream,
            ConnectorRawPageIden::Payload,
            ConnectorRawPageIden::CursorAfter,
            ConnectorRawPageIden::PayloadHash,
        ])
        .values_panic([
            model.provider_account_ref.into(),
            model.stream.into(),
            model.payload.into(),
            model.cursor_after.into(),
            model.payload_hash.into(),
        ])
        .returning_col(ConnectorRawPageIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_latest_raw_page_cursor(provider_account_ref: Uuid) -> DbQueryWithValues {
    Query::select()
        .column((
            ConnectorRawPageIden::Table,
            ConnectorRawPageIden::CursorAfter,
        ))
        .from(ConnectorRawPageIden::Table)
        .and_where(
            Expr::col((
                ConnectorRawPageIden::Table,
                ConnectorRawPageIden::ProviderAccountId,
            ))
            .eq(provider_account_ref),
        )
        .order_by(
            (ConnectorRawPageIden::Table, ConnectorRawPageIden::FetchedAt),
            sea_query::Order::Desc,
        )
        .order_by(
            (ConnectorRawPageIden::Table, ConnectorRawPageIden::Id),
            sea_query::Order::Desc,
        )
        .limit(1)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_raw_pages_for_provider_account(
    provider_account_ref: Uuid,
    after_page_id: Option<Uuid>,
) -> DbQueryWithValues {
    let mut query = Query::select();
    query
        .column((ConnectorRawPageIden::Table, ConnectorRawPageIden::Id))
        .column((ConnectorRawPageIden::Table, ConnectorRawPageIden::Stream))
        .column((ConnectorRawPageIden::Table, ConnectorRawPageIden::Payload))
        .from(ConnectorRawPageIden::Table)
        .and_where(
            Expr::col((
                ConnectorRawPageIden::Table,
                ConnectorRawPageIden::ProviderAccountId,
            ))
            .eq(provider_account_ref),
        )
        .order_by(
            (ConnectorRawPageIden::Table, ConnectorRawPageIden::Id),
            sea_query::Order::Asc,
        );

    if let Some(after) = after_page_id {
        query.and_where(
            Expr::col((ConnectorRawPageIden::Table, ConnectorRawPageIden::Id)).gt(after),
        );
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}
