use shared::view_models::ai::usage::{
    AiUsageMetricViewModel, AiUsageResponseViewModel, AiUsageWindowViewModel,
};

use crate::models::{AiUsage, AiUsageMetric, AiUsageWindow};

pub fn extract_ai_usage(body: &str) -> Result<AiUsage, String> {
    let resp: AiUsageResponseViewModel = serde_json::from_str(body).map_err(|e| e.to_string())?;
    Ok(AiUsage {
        hourly: window_from(resp.hourly),
        monthly: window_from(resp.monthly),
    })
}

fn window_from(vm: AiUsageWindowViewModel) -> AiUsageWindow {
    AiUsageWindow {
        input: metric_from(vm.input),
        output: metric_from(vm.output),
        reset_at: vm.reset_at.unix_timestamp(),
    }
}

fn metric_from(vm: AiUsageMetricViewModel) -> AiUsageMetric {
    AiUsageMetric {
        used: vm.used,
        limit: vm.limit,
    }
}
