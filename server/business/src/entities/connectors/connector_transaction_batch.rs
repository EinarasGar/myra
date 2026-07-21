use std::collections::HashMap;

use connectors::models::transaction::ProviderTransaction;
use dal::models::connector_models::ConnectorTransactionRow;

pub(crate) struct ConnectorTransactionBatch {
    transactions: Vec<ProviderTransaction>,
    duplicates: usize,
}

pub(crate) struct ClassifiedBatch<'a> {
    pub new: Vec<&'a ProviderTransaction>,
    pub unchanged: usize,
    pub amended: Vec<&'a ProviderTransaction>,
    pub conflicts: Vec<&'a ProviderTransaction>,
}

impl ConnectorTransactionBatch {
    pub fn from_mapped(mapped: Vec<ProviderTransaction>) -> Self {
        let mut by_external_id: HashMap<String, ProviderTransaction> = HashMap::new();
        let mut duplicates = 0usize;
        for tx in mapped {
            if by_external_id.insert(tx.external_id.clone(), tx).is_some() {
                duplicates += 1;
            }
        }

        let mut transactions: Vec<ProviderTransaction> = by_external_id.into_values().collect();
        transactions.sort_by(|a, b| {
            a.date
                .cmp(&b.date)
                .then_with(|| a.external_id.cmp(&b.external_id))
        });

        Self {
            transactions,
            duplicates,
        }
    }

    pub fn external_ids(&self) -> Vec<String> {
        self.transactions
            .iter()
            .map(|tx| tx.external_id.clone())
            .collect()
    }

    pub fn duplicates(&self) -> usize {
        self.duplicates
    }

    pub fn is_empty(&self) -> bool {
        self.transactions.is_empty()
    }

    pub fn classify(
        &self,
        ledger: &HashMap<String, ConnectorTransactionRow>,
    ) -> ClassifiedBatch<'_> {
        let mut classified = ClassifiedBatch {
            new: Vec::new(),
            unchanged: 0,
            amended: Vec::new(),
            conflicts: Vec::new(),
        };
        for tx in &self.transactions {
            match ledger.get(&tx.external_id) {
                None => classified.new.push(tx),
                Some(row) if row.external_hash == tx.external_hash() => classified.unchanged += 1,
                Some(row) if row.edited_by_user => classified.conflicts.push(tx),
                Some(_) => classified.amended.push(tx),
            }
        }
        classified
    }
}
