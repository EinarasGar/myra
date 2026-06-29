//! Tool-call approval gate for the chat workflow. Builds a parallel toolset
//! containing only the gated tools (used to replay them after the user has
//! approved or declined), and a `PromptHook` that intercepts gated tool calls
//! mid-stream so the UI can ask the user before they execute.

use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use rig::agent::{HookAction, PromptHook, ToolCallHookAction};
use rig::completion::message::Message;
use rig::providers::gemini;
use rig::tool::Tool;

use crate::action_provider::AiActionProvider;
use crate::models::chat::ToolRequestPayload;
use crate::tools::create_custom_asset::CreateCustomAssetTool;
use crate::tools::create_transaction::CreateTransactionTool;
use crate::tools::delete_transaction::DeleteTransactionTool;
use crate::tools::record_asset_swap::RecordAssetSwapTool;
use crate::tools::record_asset_trade::RecordAssetTradeTool;
use crate::tools::record_asset_transfer::RecordAssetTransferTool;
use crate::tools::record_cash_transfer::RecordCashTransferTool;
use crate::tools::record_dividend::RecordDividendTool;
use crate::tools::record_fee::RecordFeeTool;
use crate::tools::record_transfer::RecordTransferTool;
use crate::tools::update_asset_valuation::UpdateAssetValuationTool;
use crate::tools::update_transaction::UpdateTransactionTool;

const PENDING_APPROVAL_RESULT: &str = "Tool call requires user approval. Awaiting response.";

pub(crate) struct GatedToolSet {
    pub toolset: rig::tool::ToolSet,
    pub gated_names: HashSet<String>,
}

pub(crate) fn build_gated_toolset<A: AiActionProvider>(actions: Arc<A>) -> GatedToolSet {
    let mut toolset = rig::tool::ToolSet::default();
    toolset.add_tool(CreateTransactionTool::new(actions.clone()));
    toolset.add_tool(CreateCustomAssetTool::new(actions.clone()));
    toolset.add_tool(RecordAssetTradeTool::new(actions.clone()));
    toolset.add_tool(RecordTransferTool::new(actions.clone()));
    toolset.add_tool(RecordCashTransferTool::new(actions.clone()));
    toolset.add_tool(RecordAssetTransferTool::new(actions.clone()));
    toolset.add_tool(RecordAssetSwapTool::new(actions.clone()));
    toolset.add_tool(UpdateAssetValuationTool::new(actions.clone()));
    toolset.add_tool(RecordDividendTool::new(actions.clone()));
    toolset.add_tool(RecordFeeTool::new(actions.clone()));
    toolset.add_tool(UpdateTransactionTool::new(actions.clone()));
    toolset.add_tool(DeleteTransactionTool::new(actions));

    let gated_names: HashSet<String> = [
        CreateTransactionTool::<A>::NAME,
        CreateCustomAssetTool::<A>::NAME,
        RecordAssetTradeTool::<A>::NAME,
        RecordTransferTool::<A>::NAME,
        RecordCashTransferTool::<A>::NAME,
        RecordAssetTransferTool::<A>::NAME,
        RecordAssetSwapTool::<A>::NAME,
        UpdateAssetValuationTool::<A>::NAME,
        RecordDividendTool::<A>::NAME,
        RecordFeeTool::<A>::NAME,
        UpdateTransactionTool::<A>::NAME,
        DeleteTransactionTool::<A>::NAME,
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
    sender: tokio::sync::mpsc::UnboundedSender<ToolRequestPayload>,
    gated_names: HashSet<String>,
    captured: Arc<AtomicBool>,
}

impl ApprovalHook {
    pub(crate) fn new(
        sender: tokio::sync::mpsc::UnboundedSender<ToolRequestPayload>,
        gated_names: HashSet<String>,
    ) -> Self {
        Self {
            sender,
            gated_names,
            captured: Arc::new(AtomicBool::new(false)),
        }
    }
}

impl PromptHook<gemini::completion::CompletionModel> for ApprovalHook {
    // Once a gated call has been captured, stop before the next model turn so
    // the user can approve. Skipping (rather than terminating) on the call
    // itself lets every gated call in the same turn be captured first.
    async fn on_completion_call(&self, _prompt: &Message, _history: &[Message]) -> HookAction {
        if self.captured.load(Ordering::SeqCst) {
            HookAction::terminate(PENDING_APPROVAL_RESULT)
        } else {
            HookAction::cont()
        }
    }

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
            self.captured.store(true, Ordering::SeqCst);
            ToolCallHookAction::skip(PENDING_APPROVAL_RESULT)
        } else {
            ToolCallHookAction::Continue
        }
    }
}
