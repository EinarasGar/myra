use sea_query::*;
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::idens::ai_conversation_idens::{AiChatIden, AiConversationsIden, AiMessagesIden};
use crate::query_params::ai_conversation_params::{
    GetConversationsParams, GetConversationsSearchType, GetMessagesParams,
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn create_conversation(user_id: Uuid) -> DbQueryWithValues {
    Query::insert()
        .into_table(AiConversationsIden::Table)
        .columns([AiConversationsIden::UserId])
        .values_panic([user_id.into()])
        .returning(Query::returning().column(AiConversationsIden::Id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn create_chat(conversation_id: Uuid) -> DbQueryWithValues {
    Query::insert()
        .into_table(AiChatIden::Table)
        .columns([AiChatIden::ConversationId])
        .values_panic([conversation_id.into()])
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_owned_conversation_id(conversation_id: Uuid, user_id: Uuid) -> DbQueryWithValues {
    Query::select()
        .column(AiConversationsIden::Id)
        .from(AiConversationsIden::Table)
        .and_where(Expr::col(AiConversationsIden::Id).eq(conversation_id))
        .and_where(Expr::col(AiConversationsIden::UserId).eq(user_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_conversations(params: GetConversationsParams) -> DbQueryWithValues {
    let mut query = Query::select();
    query
        .column(AiConversationsIden::Id)
        .column(AiConversationsIden::UserId)
        .column((AiConversationsIden::Table, AiConversationsIden::CreatedAt))
        .column((AiConversationsIden::Table, AiConversationsIden::UpdatedAt))
        .expr_as(
            Expr::cust(
                r#"COALESCE(ai_chat.title, (
                    SELECT left((
                        SELECT string_agg(word, ' ' ORDER BY ord)
                        FROM (
                            SELECT word, ord
                            FROM regexp_split_to_table(
                                trim(regexp_replace(m.content ->> 'content', '\s+', ' ', 'g')),
                                ' '
                            ) WITH ORDINALITY AS words(word, ord)
                            WHERE word <> ''
                            ORDER BY ord
                            LIMIT 8
                        ) preview_words
                    ), 60)
                    FROM ai_messages m
                    WHERE m.conversation_id = ai_conversations.id AND m.role = 'user'
                    ORDER BY m.created_at ASC, m.id ASC
                    LIMIT 1
                ))"#,
            ),
            Alias::new("title"),
        )
        .from(AiConversationsIden::Table)
        .inner_join(
            AiChatIden::Table,
            Expr::col((AiChatIden::Table, AiChatIden::ConversationId))
                .equals((AiConversationsIden::Table, AiConversationsIden::Id)),
        )
        .and_where(Expr::col(AiConversationsIden::UserId).eq(params.user_id));
    match params.search_type {
        GetConversationsSearchType::ById(id) => {
            query.and_where(Expr::col(AiConversationsIden::Id).eq(id));
        }
        GetConversationsSearchType::All => {
            query.order_by(
                (AiConversationsIden::Table, AiConversationsIden::CreatedAt),
                Order::Desc,
            );
        }
    }
    if let Some(paging) = params.paging {
        query.limit(paging.count).offset(paging.start);
    }
    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn update_chat_title_if_null(conversation_id: Uuid, title: String) -> DbQueryWithValues {
    Query::update()
        .table(AiChatIden::Table)
        .value(AiChatIden::Title, title)
        .value(AiChatIden::UpdatedAt, Expr::cust("NOW()"))
        .and_where(Expr::col(AiChatIden::ConversationId).eq(conversation_id))
        .and_where(Expr::col(AiChatIden::Title).is_null())
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_chats_needing_titles(limit: u64) -> DbQueryWithValues {
    Query::select()
        .column((AiChatIden::Table, AiChatIden::ConversationId))
        .column(AiConversationsIden::UserId)
        .from(AiChatIden::Table)
        .inner_join(
            AiConversationsIden::Table,
            Expr::col((AiConversationsIden::Table, AiConversationsIden::Id))
                .equals((AiChatIden::Table, AiChatIden::ConversationId)),
        )
        .and_where(Expr::col(AiChatIden::Title).is_null())
        .and_where(Expr::exists(
            Query::select()
                .expr(Expr::val(1))
                .from(AiMessagesIden::Table)
                .and_where(
                    Expr::col((AiMessagesIden::Table, AiMessagesIden::ConversationId))
                        .equals((AiChatIden::Table, AiChatIden::ConversationId)),
                )
                .and_where(Expr::col((AiMessagesIden::Table, AiMessagesIden::Role)).eq("user"))
                .to_owned(),
        ))
        .and_where(Expr::cust(
            "EXTRACT(EPOCH FROM (NOW() - \
                 (SELECT MAX(m.created_at) FROM ai_messages m WHERE m.conversation_id = \
                 ai_chat.conversation_id))) > 600",
        ))
        .order_by(
            (AiConversationsIden::Table, AiConversationsIden::CreatedAt),
            Order::Asc,
        )
        .limit(limit)
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
            content_expr,
            file_ids_expr,
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
