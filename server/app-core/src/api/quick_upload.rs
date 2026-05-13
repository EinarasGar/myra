use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;
use uuid::Uuid;

use crate::models::PendingUpload;

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

pub fn init_table(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS pending_uploads (
            local_id         TEXT PRIMARY KEY,
            image_data       BLOB NOT NULL,
            thumbnail        BLOB,
            mime_type        TEXT NOT NULL,
            status           TEXT NOT NULL DEFAULT 'queued',
            server_upload_id TEXT,
            retry_count      INTEGER NOT NULL DEFAULT 0,
            next_retry_at    INTEGER,
            created_at       INTEGER NOT NULL,
            error_message    TEXT
        )",
    )
    .expect("failed to create pending_uploads table");
}

pub fn reset_uploading(conn: &Connection) {
    let _ = conn.execute(
        "UPDATE pending_uploads SET status = 'queued' WHERE status = 'uploading'",
        [],
    );
}

pub fn insert(conn: &Connection, image_data: &[u8], thumbnail: Option<&[u8]>, mime_type: &str) -> String {
    let local_id = Uuid::new_v4().to_string();
    let now = now_secs();
    conn.execute(
        "INSERT INTO pending_uploads (local_id, image_data, thumbnail, mime_type, status, created_at)
         VALUES (?1, ?2, ?3, ?4, 'queued', ?5)",
        rusqlite::params![local_id, image_data, thumbnail, mime_type, now],
    )
    .expect("failed to insert pending upload");
    local_id
}

pub fn get_all_active(conn: &Connection) -> Vec<PendingUpload> {
    let mut stmt = conn
        .prepare(
            "SELECT local_id, mime_type, status, server_upload_id, retry_count, created_at, error_message, thumbnail
             FROM pending_uploads
             WHERE status IN ('queued', 'uploading', 'failed')
             ORDER BY created_at DESC",
        )
        .unwrap();
    stmt.query_map([], |row| {
        Ok(PendingUpload {
            local_id: row.get(0)?,
            mime_type: row.get(1)?,
            status: row.get(2)?,
            server_upload_id: row.get(3)?,
            retry_count: row.get(4)?,
            created_at: row.get(5)?,
            error_message: row.get(6)?,
            thumbnail: row.get(7)?,
        })
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .collect()
}

pub fn get_flushable(conn: &Connection) -> Vec<(String, Vec<u8>, String)> {
    let now = now_secs();
    let mut stmt = conn
        .prepare(
            "SELECT local_id, image_data, mime_type FROM pending_uploads
             WHERE status IN ('queued', 'uploading')
             AND (next_retry_at IS NULL OR next_retry_at <= ?1)
             ORDER BY created_at ASC",
        )
        .unwrap();
    stmt.query_map([now], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect()
}

pub fn update_status(conn: &Connection, local_id: &str, status: &str) {
    let _ = conn.execute(
        "UPDATE pending_uploads SET status = ?1 WHERE local_id = ?2",
        rusqlite::params![status, local_id],
    );
}

pub fn set_server_id_and_delete(conn: &Connection, local_id: &str, _server_id: &str) {
    let _ = conn.execute(
        "DELETE FROM pending_uploads WHERE local_id = ?1",
        [local_id],
    );
}

pub fn mark_failed(conn: &Connection, local_id: &str, error: &str, permanent: bool) {
    if permanent {
        let _ = conn.execute(
            "UPDATE pending_uploads SET status = 'failed', error_message = ?1 WHERE local_id = ?2",
            rusqlite::params![error, local_id],
        );
        return;
    }

    let _ = conn.execute(
        "UPDATE pending_uploads SET status = 'queued', retry_count = retry_count + 1, error_message = ?1 WHERE local_id = ?2",
        rusqlite::params![error, local_id],
    );
    let retry_count: u32 = conn
        .query_row(
            "SELECT retry_count FROM pending_uploads WHERE local_id = ?1",
            [local_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if retry_count >= 10 {
        let _ = conn.execute(
            "UPDATE pending_uploads SET status = 'failed' WHERE local_id = ?1",
            [local_id],
        );
    } else {
        let backoff_secs: i64 = match retry_count {
            1 => 30,
            2 => 60,
            3 => 120,
            4 => 300,
            _ => 900,
        };
        let next = now_secs() + backoff_secs;
        let _ = conn.execute(
            "UPDATE pending_uploads SET next_retry_at = ?1 WHERE local_id = ?2",
            rusqlite::params![next, local_id],
        );
    }
}

pub fn delete(conn: &Connection, local_id: &str) -> bool {
    conn.execute("DELETE FROM pending_uploads WHERE local_id = ?1", [local_id])
        .map(|n| n > 0)
        .unwrap_or(false)
}

