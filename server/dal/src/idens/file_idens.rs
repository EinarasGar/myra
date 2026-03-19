use sea_query::Iden;

pub enum UserFilesIden {
    Table,
    Id,
    UserId,
    OriginalName,
    MimeType,
    SizeBytes,
    Status,
    StorageKey,
    ThumbnailKey,
    CreatedAt,
    UpdatedAt,
}

impl Iden for UserFilesIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "user_files",
            Self::Id => "id",
            Self::UserId => "user_id",
            Self::OriginalName => "original_name",
            Self::MimeType => "mime_type",
            Self::SizeBytes => "size_bytes",
            Self::Status => "status",
            Self::StorageKey => "storage_key",
            Self::ThumbnailKey => "thumbnail_key",
            Self::CreatedAt => "created_at",
            Self::UpdatedAt => "updated_at",
        }
    }
}
