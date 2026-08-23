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

pub fn init_table(conn: &Connection, initial_base_url: &str) {
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
            error_message    TEXT,
            server_url       TEXT NOT NULL DEFAULT ''
        )",
    )
    .expect("failed to create pending_uploads table");

    let has_col: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('pending_uploads') WHERE name='server_url'",
            [],
            |r| r.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;
    if !has_col {
        let _ = conn.execute(
            "ALTER TABLE pending_uploads ADD COLUMN server_url TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = conn.execute(
            "UPDATE pending_uploads SET server_url = ?1 WHERE server_url = ''",
            rusqlite::params![initial_base_url],
        );
    }
}

pub fn reset_uploading(conn: &Connection, server_url: &str) {
    let _ = conn.execute(
        "UPDATE pending_uploads SET status = 'queued' WHERE status = 'uploading' AND server_url = ?1",
        rusqlite::params![server_url],
    );
}

pub fn insert(
    conn: &Connection,
    image_data: &[u8],
    thumbnail: Option<&[u8]>,
    mime_type: &str,
    server_url: &str,
) -> String {
    let local_id = Uuid::new_v4().to_string();
    let now = now_secs();
    conn.execute(
        "INSERT INTO pending_uploads (local_id, image_data, thumbnail, mime_type, status, created_at, server_url)
         VALUES (?1, ?2, ?3, ?4, 'queued', ?5, ?6)",
        rusqlite::params![local_id, image_data, thumbnail, mime_type, now, server_url],
    )
    .expect("failed to insert pending upload");
    local_id
}

pub fn get_all_active(conn: &Connection, server_url: &str) -> Vec<PendingUpload> {
    let mut stmt = conn
        .prepare(
            "SELECT local_id, mime_type, status, server_upload_id, retry_count, created_at, error_message, thumbnail
             FROM pending_uploads
             WHERE status IN ('queued', 'uploading', 'failed') AND server_url = ?1
             ORDER BY created_at DESC",
        )
        .unwrap();
    stmt.query_map(rusqlite::params![server_url], |row| {
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

pub fn get_flushable(conn: &Connection, server_url: &str) -> Vec<(String, Vec<u8>, String)> {
    let now = now_secs();
    let mut stmt = conn
        .prepare(
            "SELECT local_id, image_data, mime_type FROM pending_uploads
             WHERE status IN ('queued', 'uploading') AND server_url = ?1
             AND (next_retry_at IS NULL OR next_retry_at <= ?2)
             ORDER BY created_at ASC",
        )
        .unwrap();
    stmt.query_map(rusqlite::params![server_url, now], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    })
    .unwrap()
    .filter_map(|r| r.ok())
    .collect()
}

pub fn update_status(conn: &Connection, local_id: &str, status: &str, server_url: &str) {
    let _ = conn.execute(
        "UPDATE pending_uploads SET status = ?1 WHERE local_id = ?2 AND server_url = ?3",
        rusqlite::params![status, local_id, server_url],
    );
}

pub fn set_server_id_and_delete(
    conn: &Connection,
    local_id: &str,
    _server_id: &str,
    server_url: &str,
) {
    let _ = conn.execute(
        "DELETE FROM pending_uploads WHERE local_id = ?1 AND server_url = ?2",
        rusqlite::params![local_id, server_url],
    );
}

pub fn mark_failed(
    conn: &Connection,
    local_id: &str,
    error: &str,
    permanent: bool,
    server_url: &str,
) {
    if permanent {
        let _ = conn.execute(
            "UPDATE pending_uploads SET status = 'failed', error_message = ?1 WHERE local_id = ?2 AND server_url = ?3",
            rusqlite::params![error, local_id, server_url],
        );
        return;
    }

    let _ = conn.execute(
        "UPDATE pending_uploads SET status = 'queued', retry_count = retry_count + 1, error_message = ?1 WHERE local_id = ?2 AND server_url = ?3",
        rusqlite::params![error, local_id, server_url],
    );
    let retry_count: u32 = conn
        .query_row(
            "SELECT retry_count FROM pending_uploads WHERE local_id = ?1 AND server_url = ?2",
            rusqlite::params![local_id, server_url],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if retry_count >= 10 {
        let _ = conn.execute(
            "UPDATE pending_uploads SET status = 'failed' WHERE local_id = ?1 AND server_url = ?2",
            rusqlite::params![local_id, server_url],
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
            "UPDATE pending_uploads SET next_retry_at = ?1 WHERE local_id = ?2 AND server_url = ?3",
            rusqlite::params![next, local_id, server_url],
        );
    }
}

pub fn delete(conn: &Connection, local_id: &str, server_url: &str) -> bool {
    conn.execute(
        "DELETE FROM pending_uploads WHERE local_id = ?1 AND server_url = ?2",
        rusqlite::params![local_id, server_url],
    )
    .map(|n| n > 0)
    .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn open_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_table(&conn, "https://server-a.example.com");
        conn
    }

    #[test]
    fn test_server_url_scoping() {
        let conn = open_test_db();

        let id_a = insert(
            &conn,
            &[1, 2, 3],
            None,
            "image/png",
            "https://server-a.example.com",
        );

        let active_a = get_all_active(&conn, "https://server-a.example.com");
        assert_eq!(active_a.len(), 1);
        assert_eq!(active_a[0].local_id, id_a);

        let active_b = get_all_active(&conn, "https://server-b.example.com");
        assert_eq!(active_b.len(), 0);

        let flushable_a = get_flushable(&conn, "https://server-a.example.com");
        assert_eq!(flushable_a.len(), 1);

        let flushable_b = get_flushable(&conn, "https://server-b.example.com");
        assert_eq!(flushable_b.len(), 0);
    }

    #[test]
    fn test_reset_uploading_scoped() {
        let conn = open_test_db();

        let id_a = insert(
            &conn,
            &[1],
            None,
            "image/png",
            "https://server-a.example.com",
        );
        let id_b = insert(
            &conn,
            &[2],
            None,
            "image/png",
            "https://server-b.example.com",
        );

        update_status(&conn, &id_a, "uploading", "https://server-a.example.com");
        update_status(&conn, &id_b, "uploading", "https://server-b.example.com");

        reset_uploading(&conn, "https://server-a.example.com");

        let active_a = get_all_active(&conn, "https://server-a.example.com");
        assert_eq!(active_a[0].status, "queued");

        let active_b = get_all_active(&conn, "https://server-b.example.com");
        assert_eq!(active_b[0].status, "uploading");
    }

    #[test]
    fn test_delete_scoped() {
        let conn = open_test_db();

        let id_a = insert(
            &conn,
            &[1],
            None,
            "image/png",
            "https://server-a.example.com",
        );

        assert!(!delete(&conn, &id_a, "https://server-b.example.com"));
        assert!(delete(&conn, &id_a, "https://server-a.example.com"));
    }
}
