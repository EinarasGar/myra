#[derive(Debug, Default, Clone, PartialEq)]
pub struct SyncReportDto {
    pub new_transactions: usize,
    pub unchanged: usize,
    pub amended: usize,
    pub conflicts: usize,
    pub unresolved: usize,
    pub duplicates: usize,
    pub pages_projected: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SyncOutcomeDto {
    Complete {
        report: SyncReportDto,
    },
    Partial {
        pages_fetched: i32,
        next_cursor: Option<serde_json::Value>,
    },
    Failed {
        error: String,
    },
}

#[derive(Debug, Clone)]
pub struct ClientSuppliedStreamDto {
    pub stream: String,
    pub items: Vec<serde_json::Value>,
}

pub enum TransientSyncCredentialDto {
    Transient(String),
    ClientSupplied {
        streams: Vec<ClientSuppliedStreamDto>,
        raw_balance: serde_json::Value,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub enum SyncDispatchDto {
    Queued,
    Completed { report: SyncReportDto },
    Partial { pages_fetched: i32 },
}
