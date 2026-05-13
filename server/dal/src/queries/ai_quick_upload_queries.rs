use sea_query::*;
use sea_query_sqlx::SqlxBinder;
use sqlx::types::Uuid;

use crate::idens::ai_conversation_idens::{AiConversationsIden, AiWorkflowQuickUploadIden};
use crate::query_params::ai_conversation_params::{
    GetQuickUploadsParams, GetQuickUploadsSearchType, QuickUploadStatus,
};

use super::DbQueryWithValues;

#[tracing::instrument(skip_all)]
pub fn create_quick_upload(conversation_id: Uuid, source_file_id: Uuid) -> DbQueryWithValues {
    Query::insert()
        .into_table(AiWorkflowQuickUploadIden::Table)
        .columns([
            AiWorkflowQuickUploadIden::ConversationId,
            AiWorkflowQuickUploadIden::SourceFileId,
        ])
        .values_panic([conversation_id.into(), source_file_id.into()])
        .returning(Query::returning().column(AiWorkflowQuickUploadIden::Id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn get_quick_uploads(params: GetQuickUploadsParams) -> DbQueryWithValues {
    let mut query = Query::select();
    query
        .column((
            AiWorkflowQuickUploadIden::Table,
            AiWorkflowQuickUploadIden::Id,
        ))
        .column((
            AiWorkflowQuickUploadIden::Table,
            AiWorkflowQuickUploadIden::ConversationId,
        ))
        .column((
            AiWorkflowQuickUploadIden::Table,
            AiWorkflowQuickUploadIden::Status,
        ))
        .column((
            AiWorkflowQuickUploadIden::Table,
            AiWorkflowQuickUploadIden::SourceFileId,
        ))
        .column((
            AiWorkflowQuickUploadIden::Table,
            AiWorkflowQuickUploadIden::ProposalType,
        ))
        .column((
            AiWorkflowQuickUploadIden::Table,
            AiWorkflowQuickUploadIden::ProposalData,
        ))
        .column((
            AiWorkflowQuickUploadIden::Table,
            AiWorkflowQuickUploadIden::CreatedAt,
        ))
        .column((
            AiWorkflowQuickUploadIden::Table,
            AiWorkflowQuickUploadIden::UpdatedAt,
        ))
        .from(AiWorkflowQuickUploadIden::Table)
        .inner_join(
            AiConversationsIden::Table,
            Expr::col((AiConversationsIden::Table, AiConversationsIden::Id)).equals((
                AiWorkflowQuickUploadIden::Table,
                AiWorkflowQuickUploadIden::ConversationId,
            )),
        )
        .and_where(
            Expr::col((AiConversationsIden::Table, AiConversationsIden::UserId)).eq(params.user_id),
        );

    match params.search_type {
        GetQuickUploadsSearchType::ById(id) => {
            query.and_where(
                Expr::col((
                    AiWorkflowQuickUploadIden::Table,
                    AiWorkflowQuickUploadIden::Id,
                ))
                .eq(id),
            );
        }
        GetQuickUploadsSearchType::All { status_filter } => {
            query.order_by(
                (
                    AiWorkflowQuickUploadIden::Table,
                    AiWorkflowQuickUploadIden::CreatedAt,
                ),
                Order::Desc,
            );
            if let Some(statuses) = status_filter {
                if !statuses.is_empty() {
                    let values: Vec<String> = statuses.iter().map(|s| s.to_string()).collect();
                    query.and_where(
                        Expr::col((
                            AiWorkflowQuickUploadIden::Table,
                            AiWorkflowQuickUploadIden::Status,
                        ))
                        .is_in(values),
                    );
                }
            }
        }
    }

    if let Some(paging) = params.paging {
        query.limit(paging.count).offset(paging.start);
    }

    query.build_sqlx(PostgresQueryBuilder).into()
}

#[tracing::instrument(skip_all)]
pub fn update_quick_upload_status(
    quick_upload_id: Uuid,
    status: QuickUploadStatus,
) -> DbQueryWithValues {
    Query::update()
        .table(AiWorkflowQuickUploadIden::Table)
        .value(AiWorkflowQuickUploadIden::Status, status.to_string())
        .value(AiWorkflowQuickUploadIden::UpdatedAt, Expr::cust("NOW()"))
        .and_where(Expr::col(AiWorkflowQuickUploadIden::Id).eq(quick_upload_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}

#[tracing::instrument(skip_all)]
pub fn update_quick_upload_proposal(
    quick_upload_id: Uuid,
    proposal_type: String,
    proposal_data: serde_json::Value,
) -> DbQueryWithValues {
    let proposal_data_expr = Expr::cust_with_values(
        "$1::jsonb",
        [sea_query::Value::String(Some(
            serde_json::to_string(&proposal_data).unwrap_or_default(),
        ))],
    );

    Query::update()
        .table(AiWorkflowQuickUploadIden::Table)
        .value(AiWorkflowQuickUploadIden::ProposalType, proposal_type)
        .value(AiWorkflowQuickUploadIden::ProposalData, proposal_data_expr)
        .value(AiWorkflowQuickUploadIden::UpdatedAt, Expr::cust("NOW()"))
        .and_where(Expr::col(AiWorkflowQuickUploadIden::Id).eq(quick_upload_id))
        .build_sqlx(PostgresQueryBuilder)
        .into()
}
