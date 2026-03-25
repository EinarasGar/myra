use std::collections::HashSet;
use std::sync::Arc;

use rig::agent::{PromptHook, ToolCallHookAction};
use rig::providers::gemini;
use rig::tool::Tool;
use uuid::Uuid;

use crate::action_provider::AiActionProvider;
use crate::models::chat::ToolRequestPayload;
use crate::tools::create_transaction::CreateTransactionTool;
use crate::tools::create_transaction_group::CreateTransactionGroupTool;

pub(crate) struct GatedToolSet {
    pub toolset: rig::tool::ToolSet,
    pub gated_names: HashSet<String>,
}

pub(crate) fn build_gated_toolset<A: AiActionProvider>(
    actions: Arc<A>,
    user_id: Uuid,
) -> GatedToolSet {
    let mut toolset = rig::tool::ToolSet::default();
    toolset.add_tool(CreateTransactionTool::new(actions.clone(), user_id));
    toolset.add_tool(CreateTransactionGroupTool::new(actions, user_id));

    let gated_names: HashSet<String> = [
        CreateTransactionTool::<A>::NAME,
        CreateTransactionGroupTool::<A>::NAME,
    ]
    .iter()
    .map(|s: &&str| s.to_string())
    .collect();

    GatedToolSet {
        toolset,
        gated_names,
    }
}

#[derive(Clone)]
pub(crate) struct ApprovalHook {
    pub sender: tokio::sync::mpsc::UnboundedSender<ToolRequestPayload>,
    pub gated_names: HashSet<String>,
}

impl PromptHook<gemini::completion::CompletionModel> for ApprovalHook {
    async fn on_tool_call(
        &self,
        tool_name: &str,
        tool_call_id: Option<String>,
        internal_call_id: &str,
        args: &str,
    ) -> ToolCallHookAction {
        if self.gated_names.contains(tool_name) {
            let _ = self.sender.send(ToolRequestPayload {
                tool_call_id: tool_call_id.unwrap_or_else(|| internal_call_id.to_string()),
                name: tool_name.to_string(),
                args: args.to_string(),
            });
            ToolCallHookAction::Terminate {
                reason: "Tool call requires user approval. Awaiting response.".to_string(),
            }
        } else {
            ToolCallHookAction::Continue
        }
    }
}
