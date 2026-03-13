use sea_query::*;
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::{
    idens::user_idens::{
        ExternalIdentityMappingsIden, RefreshTokensIden, UserCredentialsIden,
        UserRoleAssignmentsIden, UserRolesIden, UsersIden,
    },
    models::user_models::AddUserModel,
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn insert_user(user: AddUserModel) -> DbQueryWithValues {
    Query::insert()
        .into_table(UsersIden::Table)
        .columns([UsersIden::Username, UsersIden::DefaultAsset])
        .values_panic([user.username.into(), user.default_asset.into()])
        .returning_col(UsersIden::Id)
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_auth_info(username: String) -> DbQueryWithValues {
    Query::select()
        .column((UsersIden::Table, UsersIden::Id))
        .column((UsersIden::Table, UsersIden::Username))
        .column((UserCredentialsIden::Table, UserCredentialsIden::PasswordHash))
        .expr_as(
            Expr::col((UserRolesIden::Table, UserRolesIden::RoleName)),
            Alias::new("user_role_name"),
        )
        .from(UsersIden::Table)
        .inner_join(
            UserCredentialsIden::Table,
            Expr::col((UsersIden::Table, UsersIden::Id))
                .equals((UserCredentialsIden::Table, UserCredentialsIden::UserId)),
        )
        .inner_join(
            UserRoleAssignmentsIden::Table,
            Expr::col((UsersIden::Table, UsersIden::Id))
                .equals((UserRoleAssignmentsIden::Table, UserRoleAssignmentsIden::UserId)),
        )
        .inner_join(
            UserRolesIden::Table,
            Expr::col((UserRoleAssignmentsIden::Table, UserRoleAssignmentsIden::RoleId))
                .equals((UserRolesIden::Table, UserRolesIden::Id)),
        )
        .and_where(Expr::col(UsersIden::Username).eq(username))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_role(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column(UserRolesIden::Id)
        .expr_as(
            Expr::col(UserRolesIden::RoleName),
            Alias::new("name"),
        )
        .from(UserRoleAssignmentsIden::Table)
        .inner_join(
            UserRolesIden::Table,
            Expr::col((UserRoleAssignmentsIden::Table, UserRoleAssignmentsIden::RoleId))
                .equals((UserRolesIden::Table, UserRolesIden::Id)),
        )
        .and_where(Expr::col((UserRoleAssignmentsIden::Table, UserRoleAssignmentsIden::UserId)).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_basic_info(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column((UsersIden::Table, UsersIden::Id))
        .column((UsersIden::Table, UsersIden::Username))
        .column((UsersIden::Table, UsersIden::DefaultAsset))
        .from(UsersIden::Table)
        .and_where(Expr::col((UsersIden::Table, UsersIden::Id)).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_full_info(user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column((UsersIden::Table, UsersIden::Id))
        .column((UsersIden::Table, UsersIden::Username))
        .column((UsersIden::Table, UsersIden::DefaultAsset))
        .column((UserRolesIden::Table, UserRolesIden::RoleName))
        .expr_as(
            Expr::col((UserRoleAssignmentsIden::Table, UserRoleAssignmentsIden::RoleId)),
            Alias::new("role_id"),
        )
        .from(UsersIden::Table)
        .inner_join(
            UserRoleAssignmentsIden::Table,
            Expr::col((UsersIden::Table, UsersIden::Id))
                .equals((UserRoleAssignmentsIden::Table, UserRoleAssignmentsIden::UserId)),
        )
        .inner_join(
            UserRolesIden::Table,
            Expr::col((UserRoleAssignmentsIden::Table, UserRoleAssignmentsIden::RoleId))
                .equals((UserRolesIden::Table, UserRolesIden::Id)),
        )
        .and_where(Expr::col((UsersIden::Table, UsersIden::Id)).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_user_credentials(user_id: Uuid, password_hash: String) -> DbQueryWithValues {
    Query::insert()
        .into_table(UserCredentialsIden::Table)
        .columns([UserCredentialsIden::UserId, UserCredentialsIden::PasswordHash])
        .values_panic([user_id.into(), password_hash.into()])
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_user_role_assignment(user_id: Uuid, role_id: i32) -> DbQueryWithValues {
    Query::insert()
        .into_table(UserRoleAssignmentsIden::Table)
        .columns([UserRoleAssignmentsIden::UserId, UserRoleAssignmentsIden::RoleId])
        .values_panic([user_id.into(), role_id.into()])
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_user_by_external_id(provider: String, external_user_id: String) -> DbQueryWithValues {
    Query::select()
        .expr_as(
            Expr::col((UsersIden::Table, UsersIden::Id)),
            Alias::new("user_id"),
        )
        .column((UsersIden::Table, UsersIden::Username))
        .from(ExternalIdentityMappingsIden::Table)
        .inner_join(
            UsersIden::Table,
            Expr::col((ExternalIdentityMappingsIden::Table, ExternalIdentityMappingsIden::UserId))
                .equals((UsersIden::Table, UsersIden::Id)),
        )
        .and_where(
            Expr::col((ExternalIdentityMappingsIden::Table, ExternalIdentityMappingsIden::Provider))
                .eq(provider),
        )
        .and_where(
            Expr::col((ExternalIdentityMappingsIden::Table, ExternalIdentityMappingsIden::ExternalUserId))
                .eq(external_user_id),
        )
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_refresh_token(
    user_id: Uuid,
    token_hash: String,
    expires_at: sqlx::types::time::OffsetDateTime,
) -> DbQueryWithValues {
    Query::insert()
        .into_table(RefreshTokensIden::Table)
        .columns([
            RefreshTokensIden::UserId,
            RefreshTokensIden::TokenHash,
            RefreshTokensIden::ExpiresAt,
        ])
        .values_panic([user_id.into(), token_hash.into(), expires_at.into()])
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_refresh_token_by_hash(token_hash: String) -> DbQueryWithValues {
    Query::select()
        .column(RefreshTokensIden::Id)
        .column(RefreshTokensIden::UserId)
        .column(RefreshTokensIden::TokenHash)
        .column(RefreshTokensIden::ExpiresAt)
        .from(RefreshTokensIden::Table)
        .and_where(Expr::col(RefreshTokensIden::TokenHash).eq(token_hash))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_refresh_token_by_id(id: i32) -> DbQueryWithValues {
    Query::delete()
        .from_table(RefreshTokensIden::Table)
        .and_where(Expr::col(RefreshTokensIden::Id).eq(id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_all_refresh_tokens_for_user(user_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(RefreshTokensIden::Table)
        .and_where(Expr::col(RefreshTokensIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn delete_expired_refresh_tokens() -> DbQueryWithValues {
    Query::delete()
        .from_table(RefreshTokensIden::Table)
        .and_where(Expr::col(RefreshTokensIden::ExpiresAt).lt(Expr::cust("NOW()")))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_external_identity_mapping(provider: String, external_user_id: String, user_id: Uuid) -> DbQueryWithValues {
    Query::insert()
        .into_table(ExternalIdentityMappingsIden::Table)
        .columns([
            ExternalIdentityMappingsIden::Provider,
            ExternalIdentityMappingsIden::ExternalUserId,
            ExternalIdentityMappingsIden::UserId,
        ])
        .values_panic([provider.into(), external_user_id.into(), user_id.into()])
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
