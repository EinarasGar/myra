use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderTransaction {
    pub external_id: String,
    pub amount: Decimal,
    pub currency: String,
    pub date: time::OffsetDateTime,
    pub description: String,
    pub asset_identifier: Option<String>,
    pub quantity: Option<Decimal>,
}

impl ProviderTransaction {
    pub fn external_hash(&self) -> String {
        let mut hasher = Sha256::new();
        for part in [
            self.external_id.as_str(),
            &self.amount.to_string(),
            self.currency.as_str(),
            &self
                .date
                .format(&time::format_description::well_known::Rfc3339)
                .unwrap_or_default(),
            self.description.as_str(),
            self.asset_identifier.as_deref().unwrap_or(""),
            &self.quantity.map(|q| q.to_string()).unwrap_or_default(),
        ] {
            hasher.update(part.as_bytes());
            hasher.update(b":");
        }
        format!("{:x}", hasher.finalize())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkippedTransaction {
    pub external_id: String,
    pub reason: String,
}

pub enum MappedTransaction {
    Provider(ProviderTransaction),
    Skipped(SkippedTransaction),
}

pub(crate) fn log_skipped(provider: &str, skipped: &[SkippedTransaction]) {
    if skipped.is_empty() {
        return;
    }
    let mut reasons: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    for skip in skipped {
        *reasons.entry(skip.reason.as_str()).or_default() += 1;
        tracing::debug!(
            provider,
            external_id = %skip.external_id,
            reason = %skip.reason,
            "provider transaction skipped during mapping"
        );
    }
    tracing::debug!(
        provider,
        skipped = skipped.len(),
        reasons = ?reasons,
        "mapping skipped provider transactions"
    );
}
