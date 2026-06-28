use std::sync::Arc;
use std::time::Duration;

use super::ToolError;
use crate::models::tool_output::RunScriptArgs;
use boa_engine::property::Attribute;
use boa_engine::{js_string, Context, JsValue, Source};
use rig::completion::request::ToolDefinition;
use rig::tool::{Tool, ToolSet};
use serde_json::{json, Value};

const SCRIPT_TIMEOUT: Duration = Duration::from_secs(5);
const LOOP_ITERATION_LIMIT: u64 = 50_000_000;
const MAX_TOTAL_INJECTED_ROWS: usize = 50_000;

pub struct RunScriptTool {
    sources: Arc<ToolSet>,
    source_defs: Vec<ToolDefinition>,
}

impl RunScriptTool {
    pub async fn new(sources: Arc<ToolSet>) -> Self {
        let source_defs = sources.get_tool_definitions().await.unwrap_or_default();
        Self {
            sources,
            source_defs,
        }
    }
}

impl Tool for RunScriptTool {
    const NAME: &'static str = "run_script";

    type Error = ToolError;
    type Args = RunScriptArgs;
    type Output = String;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        let source_names: Vec<String> = self.source_defs.iter().map(|d| d.name.clone()).collect();
        let sources_doc = self
            .source_defs
            .iter()
            .map(|d| format!("- {}: {}", d.name, d.description))
            .collect::<Vec<_>>()
            .join("\n");

        let description = format!(
            "Run JavaScript in a sandboxed interpreter to compute over data. No network, file, or system access — pure computation only (arithmetic, arrays, objects, strings, JSON, Math). The value of the script's final expression is returned as JSON.\n\nOptionally declare `datasets` to load the user's data server-side (uncapped) before the script runs; each is injected as a global array named by its `name`. The script cannot fetch more data — declare everything up front. Use this to process large amounts of data (e.g. deduplicating or totalling hundreds of transactions) without listing it into the conversation.\n\nLoadable read-only sources (each injects a JSON array):\n{sources_doc}\n\nExample: datasets [{{\"name\": \"txns\", \"tool\": \"search_transactions\", \"args\": {{\"date_from\": \"2025-01-01\", \"date_to\": \"2025-06-30\"}}}}], script \"txns.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0)\"."
        );

        ToolDefinition {
            name: Self::NAME.to_string(),
            description,
            parameters: json!({
                "type": "object",
                "properties": {
                    "script": {
                        "type": "string",
                        "description": "JavaScript source. The value of the final expression is returned. Declared datasets are available as global arrays."
                    },
                    "datasets": {
                        "type": "array",
                        "description": "Optional datasets to fetch server-side and expose to the script as globals.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": { "type": "string", "description": "Global variable name to bind the dataset to. Must be a valid JavaScript identifier, e.g. `txns`." },
                                "tool": { "type": "string", "enum": source_names, "description": "Which read-only data source to load." },
                                "args": { "type": "object", "description": "Arguments for the source, using the parameters described for it above." }
                            },
                            "required": ["name", "tool"]
                        }
                    }
                },
                "required": ["script"]
            }),
        }
    }

    #[tracing::instrument(level = "debug", skip_all, fields(tool = Self::NAME))]
    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let mut globals: Vec<(String, Value)> = Vec::new();
        let mut total_rows = 0usize;

        for dataset in &args.datasets {
            if !self.sources.contains(&dataset.tool) {
                return Ok(error_output(&format!(
                    "unknown source `{}` for dataset `{}`",
                    dataset.tool, dataset.name
                )));
            }

            let dataset_args = if dataset.args.is_null() {
                "{}".to_string()
            } else {
                dataset.args.to_string()
            };

            let raw = match self.sources.call(&dataset.tool, dataset_args).await {
                Ok(raw) => raw,
                Err(e) => {
                    return Ok(error_output(&format!(
                        "failed to load dataset `{}`: {e}",
                        dataset.name
                    )))
                }
            };

            let value: Value = serde_json::from_str(&raw)?;
            total_rows += value.as_array().map_or(0, Vec::len);
            if total_rows > MAX_TOTAL_INJECTED_ROWS {
                return Ok(error_output(&format!(
                    "datasets exceed the {MAX_TOTAL_INJECTED_ROWS} row injection limit; narrow the filters (e.g. a tighter date range)"
                )));
            }

            globals.push((dataset.name.clone(), value));
        }

        let script = args.script;
        let join = tokio::task::spawn_blocking(move || run_in_sandbox(&script, &globals));

        match tokio::time::timeout(SCRIPT_TIMEOUT, join).await {
            Ok(Ok(output)) => Ok(output),
            Ok(Err(_)) => Ok(error_output("script execution panicked")),
            Err(_) => Ok(error_output(&format!(
                "script timed out after {}s",
                SCRIPT_TIMEOUT.as_secs()
            ))),
        }
    }
}

fn run_in_sandbox(script: &str, globals: &[(String, Value)]) -> String {
    let mut context = Context::default();
    context
        .runtime_limits_mut()
        .set_loop_iteration_limit(LOOP_ITERATION_LIMIT);

    for (name, value) in globals {
        let js_value = match JsValue::from_json(value, &mut context) {
            Ok(v) => v,
            Err(e) => return error_output(&format!("failed to inject `{name}`: {e}")),
        };
        if let Err(e) =
            context.register_global_property(js_string!(name.as_str()), js_value, Attribute::all())
        {
            return error_output(&format!("failed to register `{name}`: {e}"));
        }
    }

    match context.eval(Source::from_bytes(script)) {
        Ok(value) => match value.to_json(&mut context) {
            Ok(Some(result)) => json!({ "ok": true, "result": result }).to_string(),
            Ok(None) => json!({ "ok": true, "result": null }).to_string(),
            Err(e) => error_output(&format!("result not serializable: {e}")),
        },
        Err(e) => error_output(&e.to_string()),
    }
}

fn error_output(message: &str) -> String {
    json!({ "ok": false, "error": message }).to_string()
}
