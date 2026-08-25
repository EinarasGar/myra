use sea_query::*;
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::idens::file_idens::UserFilesIden;
use crate::models::file_models::FileStatus;
use crate::query_params::get_files_params::{GetFilesParams, GetFilesParamsSearchType};

use super::DbQueryWithValues;

#[macros::named_query]
pub fn insert_file(
    id: Uuid,
    user_id: Uuid,
    original_name: String,
    mime_type: String,
    size_bytes: i64,
    storage_key: String,
    status: FileStatus,
) -> DbQueryWithValues {
    Query::insert()
        .into_table(UserFilesIden::Table)
        .columns([
            UserFilesIden::Id,
            UserFilesIden::UserId,
            UserFilesIden::OriginalName,
            UserFilesIden::MimeType,
            UserFilesIden::SizeBytes,
            UserFilesIden::StorageKey,
            UserFilesIden::Status,
        ])
        .values_panic([
            id.into(),
            user_id.into(),
            original_name.into(),
            mime_type.into(),
            size_bytes.into(),
            storage_key.into(),
            status.as_str().into(),
        ])
        .returning_all()
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_files(params: GetFilesParams) -> DbQueryWithValues {
    let mut query = Query::select();
    query
        .column(UserFilesIden::Id)
        .column(UserFilesIden::UserId)
        .column(UserFilesIden::OriginalName)
        .column(UserFilesIden::MimeType)
        .column(UserFilesIden::SizeBytes)
        .column(UserFilesIden::Status)
        .column(UserFilesIden::StorageKey)
        .column(UserFilesIden::ThumbnailKey)
        .column(UserFilesIden::CreatedAt)
        .column(UserFilesIden::UpdatedAt)
        .from(UserFilesIden::Table);

    query.and_where(Expr::col(UserFilesIden::UserId).eq(params.user_id));

    match params.search_type {
        GetFilesParamsSearchType::ById(id) => {
            query.and_where(Expr::col(UserFilesIden::Id).eq(id));
        }
        GetFilesParamsSearchType::ByIds(ids) => {
            query.and_where(
                Expr::col(UserFilesIden::Id).is_in(
                    ids.into_iter()
                        .map(|id| sea_query::Value::Uuid(Some(id)))
                        .collect::<Vec<_>>(),
                ),
            );
        }
        GetFilesParamsSearchType::ByKeyPrefix(prefix) => {
            query.and_where(Expr::col(UserFilesIden::StorageKey).like(format!("{}%", prefix)));
        }
    }

    if let Some(status) = params.status {
        query.and_where(Expr::col(UserFilesIden::Status).eq(status.as_str()));
    }

    if params.order_by_created_at_desc {
        query.order_by(UserFilesIden::CreatedAt, Order::Desc);
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[macros::named_query]
pub fn get_file_status_by_id_and_user(file_id: Uuid, user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column(UserFilesIden::Status)
        .from(UserFilesIden::Table)
        .and_where(Expr::col(UserFilesIden::Id).eq(file_id))
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn update_file_status(file_id: Uuid, user_id: Uuid, status: FileStatus) -> DbQueryWithValues {
    Query::update()
        .table(UserFilesIden::Table)
        .value(UserFilesIden::Status, status)
        .value(UserFilesIden::UpdatedAt, Expr::cust("NOW()"))
        .and_where(Expr::col(UserFilesIden::Id).eq(file_id))
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .returning_all()
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn update_file_status_conditional(
    file_id: Uuid,
    user_id: Uuid,
    from_status: FileStatus,
    to_status: FileStatus,
) -> DbQueryWithValues {
    Query::update()
        .table(UserFilesIden::Table)
        .value(UserFilesIden::Status, to_status)
        .value(UserFilesIden::UpdatedAt, Expr::cust("NOW()"))
        .and_where(Expr::col(UserFilesIden::Id).eq(file_id))
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .and_where(Expr::col(UserFilesIden::Status).eq(from_status))
        .returning_all()
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn update_file_ready(
    file_id: Uuid,
    user_id: Uuid,
    thumbnail_key: Option<String>,
) -> DbQueryWithValues {
    Query::update()
        .table(UserFilesIden::Table)
        .value(UserFilesIden::Status, FileStatus::Ready)
        .value(UserFilesIden::ThumbnailKey, thumbnail_key)
        .value(UserFilesIden::UpdatedAt, Expr::cust("NOW()"))
        .and_where(Expr::col(UserFilesIden::Id).eq(file_id))
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .and_where(
            Expr::col(UserFilesIden::Status)
                .is_in([FileStatus::Processing.as_str(), FileStatus::Failed.as_str()]),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn get_files_by_user(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column(UserFilesIden::StorageKey)
        .column(UserFilesIden::ThumbnailKey)
        .from(UserFilesIden::Table)
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[macros::named_query]
pub fn delete_file(file_id: Uuid, user_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(UserFilesIden::Table)
        .and_where(Expr::col(UserFilesIden::Id).eq(file_id))
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
