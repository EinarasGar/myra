use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    Csv,
    Beancount,
}

impl ExportFormat {
    pub fn extension(&self) -> &'static str {
        match self {
            ExportFormat::Csv => "csv",
            ExportFormat::Beancount => "beancount",
        }
    }

    pub fn mime_type(&self) -> &'static str {
        match self {
            ExportFormat::Csv => "text/csv",
            ExportFormat::Beancount => "text/plain",
        }
    }

    pub fn from_extension(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "csv" => Some(ExportFormat::Csv),
            "beancount" => Some(ExportFormat::Beancount),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ExportDto {
    pub id: Uuid,
    pub format: ExportFormat,
    pub created_at: OffsetDateTime,
    pub size_bytes: i64,
}
