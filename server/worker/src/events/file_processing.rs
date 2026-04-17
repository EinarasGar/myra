//! Validates an uploaded file (MIME check, size check), generates a
//! thumbnail for images, and marks the file as ready.

use anyhow::{anyhow, Result};
use dal::file_provider::FileProvider;
use dal::models::file_models::FileStatus;
use dal::queries::file_queries;
use std::sync::Arc;
use tokio::sync::Semaphore;
use uuid::Uuid;

use business::service_collection::ServiceProviders;

const MAX_THUMBNAIL_SIZE: u64 = 10_485_760;
const MIME_DETECTION_BYTES: u64 = 8192;
const MIN_DETECTABLE_FILE_SIZE: u64 = 8;
const MAX_CONCURRENT_THUMBNAILS: usize = 4;

static THUMBNAIL_SEMAPHORE: once_cell::sync::Lazy<Semaphore> =
    once_cell::sync::Lazy::new(|| Semaphore::new(MAX_CONCURRENT_THUMBNAILS));

const TEXT_BASED_MIME_TYPES: &[&str] = &[
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/xhtml+xml",
    "application/sql",
    "application/graphql",
    "application/ld+json",
    "application/x-yaml",
    "application/toml",
];

fn is_text_based_mime(mime: &str) -> bool {
    let base = mime.split(';').next().unwrap_or("").trim();
    TEXT_BASED_MIME_TYPES
        .iter()
        .any(|prefix| base.starts_with(prefix))
}

#[tracing::instrument(skip(providers))]
pub async fn handle(providers: &ServiceProviders, file_id: Uuid, user_id: Uuid) -> Result<()> {
    let query = file_queries::get_file_by_id_and_user(file_id, user_id);
    let file = providers
        .db
        .fetch_optional::<dal::models::file_models::FileModel>(query)
        .await?
        .ok_or_else(|| anyhow!("File {} not found", file_id))?;

    let result = process_file(
        &providers.file_provider,
        file_id,
        &file.storage_key,
        &file.mime_type,
        file.size_bytes,
    )
    .await;

    match result {
        Ok(thumbnail_key) => {
            let update_query =
                file_queries::update_file_ready(file_id, user_id, thumbnail_key.clone());
            let rows = providers
                .db
                .execute_with_rows_affected(update_query)
                .await?;
            if rows == 0 {
                if let Some(ref thumb_key) = thumbnail_key {
                    if let Err(e) = providers.file_provider.delete(thumb_key).await {
                        tracing::warn!(file_id = %file_id, error = %e, "Failed to clean up orphaned thumbnail");
                    }
                }
                tracing::warn!(file_id = %file_id, "update_file_ready affected 0 rows");
            }
        }
        Err(e) => {
            tracing::error!(file_id = %file_id, error = %e, "File processing failed");
            let fail_query = file_queries::update_file_status(file_id, user_id, FileStatus::Failed);
            if let Err(db_err) = providers.db.execute(fail_query).await {
                tracing::error!(file_id = %file_id, error = %db_err, "Failed to update file status to failed");
            }
            return Err(e);
        }
    }

    Ok(())
}

async fn process_file(
    file_provider: &Arc<dyn FileProvider>,
    file_id: Uuid,
    storage_key: &str,
    declared_mime: &str,
    declared_size: i64,
) -> Result<Option<String>> {
    let expected_size =
        u64::try_from(declared_size).map_err(|_| anyhow!("Invalid stored file size"))?;

    if expected_size < MIN_DETECTABLE_FILE_SIZE {
        return Err(anyhow!(
            "File too small for MIME detection ({} bytes, minimum {} required)",
            expected_size,
            MIN_DETECTABLE_FILE_SIZE
        ));
    }

    let declared_base_mime = declared_mime.split(';').next().unwrap_or("").trim();

    let header_bytes = file_provider
        .download_range(
            storage_key,
            0,
            MIME_DETECTION_BYTES.min(expected_size).saturating_sub(1),
        )
        .await?;

    match infer::get(&header_bytes) {
        Some(kind) => {
            if kind.mime_type() != declared_base_mime {
                return Err(anyhow!(
                    "MIME type mismatch: declared {} but detected {}",
                    declared_base_mime,
                    kind.mime_type()
                ));
            }
        }
        None => {
            if !is_text_based_mime(declared_mime) {
                return Err(anyhow!(
                    "Could not determine file type; upload rejected. Declared MIME: {}",
                    declared_mime
                ));
            }
        }
    }

    let actual_size = file_provider.head_object(storage_key).await?;
    if actual_size != expected_size {
        return Err(anyhow!(
            "Size mismatch: declared {} but actual {}",
            declared_size,
            actual_size
        ));
    }

    let thumbnail_key =
        if declared_base_mime.starts_with("image/") && expected_size <= MAX_THUMBNAIL_SIZE {
            let _permit = THUMBNAIL_SEMAPHORE
                .acquire()
                .await
                .map_err(|_| anyhow!("Thumbnail semaphore closed"))?;
            let bytes = file_provider.download(storage_key).await?;
            match generate_thumbnail(&bytes) {
                Ok(thumb_bytes) => {
                    let thumb_key = format!("thumbnails/{}.webp", file_id);
                    file_provider
                        .upload(&thumb_key, &thumb_bytes, "image/webp")
                        .await?;
                    Some(thumb_key)
                }
                Err(e) => {
                    tracing::warn!(file_id = %file_id, error = %e, "Failed to generate thumbnail");
                    None
                }
            }
        } else {
            None
        };

    Ok(thumbnail_key)
}

fn generate_thumbnail(bytes: &[u8]) -> Result<Vec<u8>> {
    use image::ImageReader;
    use std::io::Cursor;

    let img = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()?
        .decode()?;

    let thumbnail = img.thumbnail(256, 256);

    let mut output = Vec::new();
    thumbnail.write_to(&mut Cursor::new(&mut output), image::ImageFormat::WebP)?;

    Ok(output)
}
