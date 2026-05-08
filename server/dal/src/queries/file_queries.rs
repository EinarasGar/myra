use sea_query::*;
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::idens::file_idens::UserFilesIden;
use crate::models::file_models::FileStatus;

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn insert_file(
    id: Uuid,
    user_id: Uuid,
    original_name: String,
    mime_type: String,
    size_bytes: i64,
    storage_key: String,
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
        ])
        .values_panic([
            id.into(),
            user_id.into(),
            original_name.into(),
            mime_type.into(),
            size_bytes.into(),
            storage_key.into(),
        ])
        .returning_all()
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_file_by_id_and_user(file_id: Uuid, user_id: Uuid) -> DbQueryWithValues {
    Query::select()
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
        .from(UserFilesIden::Table)
        .and_where(Expr::col(UserFilesIden::Id).eq(file_id))
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_files_by_ids_and_user(file_ids: Vec<Uuid>, user_id: Uuid) -> DbQueryWithValues {
    Query::select()
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
        .from(UserFilesIden::Table)
        .and_where(
            Expr::col(UserFilesIden::Id).is_in(
                file_ids
                    .into_iter()
                    .map(|id| sea_query::Value::Uuid(Some(id)))
                    .collect::<Vec<_>>(),
            ),
        )
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_file_status_by_id_and_user(file_id: Uuid, user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column(UserFilesIden::Status)
        .from(UserFilesIden::Table)
        .and_where(Expr::col(UserFilesIden::Id).eq(file_id))
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
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

#[tracing::instrument(skip_all)]
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

#[tracing::instrument(skip_all)]
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
        .and_where(Expr::col(UserFilesIden::Status).eq(FileStatus::Processing))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_file(file_id: Uuid, user_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(UserFilesIden::Table)
        .and_where(Expr::col(UserFilesIden::Id).eq(file_id))
        .and_where(Expr::col(UserFilesIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
