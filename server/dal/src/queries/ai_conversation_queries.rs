use sea_query::*;
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::idens::ai_conversation_idens::{AiConversationsIden, AiMessagesIden};
use crate::query_params::ai_conversation_params::{
    GetConversationsParams, GetConversationsSearchType, GetMessagesParams,
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn create_conversation(user_id: Uuid, title: Option<String>) -> DbQueryWithValues {
    let mut columns = vec![AiConversationsIden::UserId];
    let mut values: Vec<SimpleExpr> = vec![user_id.into()];

    if let Some(ref t) = title {
        columns.push(AiConversationsIden::Title);
        values.push(t.clone().into());
    }

    Query::insert()
        .into_table(AiConversationsIden::Table)
        .columns(columns)
        .values_panic(values)
        .returning(Query::returning().column(AiConversationsIden::Id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_conversations(params: GetConversationsParams) -> DbQueryWithValues {
    let mut query = Query::select();
    query
        .column(AiConversationsIden::Id)
        .column(AiConversationsIden::UserId)
        .column(AiConversationsIden::Title)
        .column(AiConversationsIden::CreatedAt)
        .column(AiConversationsIden::UpdatedAt)
        .from(AiConversationsIden::Table)
        .and_where(Expr::col(AiConversationsIden::UserId).eq(params.user_id));

    match params.search_type {
        GetConversationsSearchType::ById(id) => {
            query.and_where(Expr::col(AiConversationsIden::Id).eq(id));
        }
        GetConversationsSearchType::All => {
            query.order_by(AiConversationsIden::CreatedAt, Order::Desc);
        }
    }

    if let Some(paging) = params.paging {
        query.limit(paging.count).offset(paging.start);
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn update_conversation_title(
    conversation_id: Uuid,
    user_id: Uuid,
    title: String,
) -> DbQueryWithValues {
    Query::update()
        .table(AiConversationsIden::Table)
        .value(AiConversationsIden::Title, title)
        .value(AiConversationsIden::UpdatedAt, Expr::cust("NOW()"))
        .and_where(Expr::col(AiConversationsIden::Id).eq(conversation_id))
        .and_where(Expr::col(AiConversationsIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn insert_message(
    conversation_id: Uuid,
    role: String,
    content: serde_json::Value,
    file_ids: Vec<Uuid>,
) -> DbQueryWithValues {
    let file_ids_expr = Expr::cust_with_values(
        "$1::uuid[]",
        [sea_query::Value::Array(
            sea_query::ArrayType::Uuid,
            Some(Box::new(
                file_ids
                    .into_iter()
                    .map(|id| sea_query::Value::Uuid(Some(id)))
                    .collect(),
            )),
        )],
    );
    let content_expr = Expr::cust_with_values(
        "$1::jsonb",
        [sea_query::Value::String(Some(
            serde_json::to_string(&content).unwrap_or_default(),
        ))],
    );

    Query::insert()
        .into_table(AiMessagesIden::Table)
        .columns([
            AiMessagesIden::ConversationId,
            AiMessagesIden::Role,
            AiMessagesIden::Content,
            AiMessagesIden::FileIds,
        ])
        .values_panic([
            conversation_id.into(),
            role.into(),
            content_expr.into(),
            file_ids_expr.into(),
        ])
        .returning(Query::returning().column(AiMessagesIden::Id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_messages(params: GetMessagesParams) -> DbQueryWithValues {
    let mut query = Query::select();
    query
        .column((AiMessagesIden::Table, AiMessagesIden::Id))
        .column((AiMessagesIden::Table, AiMessagesIden::ConversationId))
        .column((AiMessagesIden::Table, AiMessagesIden::Role))
        .column((AiMessagesIden::Table, AiMessagesIden::Content))
        .column((AiMessagesIden::Table, AiMessagesIden::FileIds))
        .column((AiMessagesIden::Table, AiMessagesIden::CreatedAt))
        .from(AiMessagesIden::Table)
        .inner_join(
            AiConversationsIden::Table,
            Expr::col((AiConversationsIden::Table, AiConversationsIden::Id))
                .equals((AiMessagesIden::Table, AiMessagesIden::ConversationId)),
        )
        .and_where(
            Expr::col((AiMessagesIden::Table, AiMessagesIden::ConversationId))
                .eq(params.conversation_id),
        )
        .and_where(
            Expr::col((AiConversationsIden::Table, AiConversationsIden::UserId)).eq(params.user_id),
        )
        .order_by((AiMessagesIden::Table, AiMessagesIden::Id), Order::Asc)
        .limit(params.limit);

    if let Some(after_id) = params.after_id {
        query.and_where(Expr::col((AiMessagesIden::Table, AiMessagesIden::Id)).gt(after_id));
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn delete_conversation(conversation_id: Uuid, user_id: Uuid) -> DbQueryWithValues {
    Query::delete()
        .from_table(AiConversationsIden::Table)
        .and_where(Expr::col(AiConversationsIden::Id).eq(conversation_id))
        .and_where(Expr::col(AiConversationsIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
