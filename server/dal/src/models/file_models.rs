use sqlx::types::Uuid;
use std::fmt;
use time::OffsetDateTime;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FileStatus {
    Pending,
    Processing,
    Ready,
    Failed,
}

impl FileStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Processing => "processing",
            Self::Ready => "ready",
            Self::Failed => "failed",
        }
    }
}

impl fmt::Display for FileStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl TryFrom<&str> for FileStatus {
    type Error = String;

    fn try_from(s: &str) -> Result<Self, Self::Error> {
        match s {
            "pending" => Ok(Self::Pending),
            "processing" => Ok(Self::Processing),
            "ready" => Ok(Self::Ready),
            "failed" => Ok(Self::Failed),
            other => Err(format!("Invalid file status: {}", other)),
        }
    }
}

impl From<String> for FileStatus {
    fn from(s: String) -> Self {
        Self::try_from(s.as_str()).unwrap_or(Self::Failed)
    }
}

impl From<FileStatus> for sea_query::Value {
    fn from(status: FileStatus) -> Self {
        sea_query::Value::String(Some(status.as_str().to_string()))
    }
}

#[derive(Debug, sqlx::FromRow)]
pub struct FileModel {
    pub id: Uuid,
    pub user_id: Uuid,
    pub original_name: String,
    pub mime_type: String,
    pub size_bytes: i64,
    pub status: String,
    pub storage_key: String,
    pub thumbnail_key: Option<String>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

impl FileModel {
    pub fn file_status(&self) -> FileStatus {
        FileStatus::try_from(self.status.as_str()).unwrap_or(FileStatus::Failed)
    }
}

#[derive(Debug, sqlx::FromRow)]
pub struct FileStatusModel {
    pub status: String,
}
