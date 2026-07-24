use rusqlite::Connection;

use super::infra::SharedInfra;

fn open(infra: &SharedInfra) -> Connection {
    let conn = Connection::open(&infra.db_path).expect("failed to open db for connector_local");
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS connector_local_credentials (
            connection_id TEXT PRIMARY KEY,
            secret        TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS connector_pending_oauth (
            id            INTEGER PRIMARY KEY CHECK (id = 1),
            connection_id TEXT NOT NULL,
            session_id    TEXT NOT NULL
        );",
    )
    .expect("failed to create connector_local tables");
    conn
}

pub fn save_credential(infra: &SharedInfra, connection_id: &str, secret: &str) {
    let _ = open(infra).execute(
        "INSERT OR REPLACE INTO connector_local_credentials (connection_id, secret) VALUES (?1, ?2)",
        rusqlite::params![connection_id, secret],
    );
}

pub fn get_credential(infra: &SharedInfra, connection_id: &str) -> Option<String> {
    open(infra)
        .query_row(
            "SELECT secret FROM connector_local_credentials WHERE connection_id = ?1",
            [connection_id],
            |row| row.get(0),
        )
        .ok()
}

pub fn has_credential(infra: &SharedInfra, connection_id: &str) -> bool {
    get_credential(infra, connection_id).is_some()
}

pub fn delete_credential(infra: &SharedInfra, connection_id: &str) {
    let _ = open(infra).execute(
        "DELETE FROM connector_local_credentials WHERE connection_id = ?1",
        [connection_id],
    );
}

pub fn save_pending_oauth(infra: &SharedInfra, connection_id: &str, session_id: &str) {
    let _ = open(infra).execute(
        "INSERT OR REPLACE INTO connector_pending_oauth (id, connection_id, session_id) VALUES (1, ?1, ?2)",
        rusqlite::params![connection_id, session_id],
    );
}

pub fn get_pending_oauth(infra: &SharedInfra) -> Option<crate::models::PendingOAuth> {
    open(infra)
        .query_row(
            "SELECT connection_id, session_id FROM connector_pending_oauth WHERE id = 1",
            [],
            |row| {
                Ok(crate::models::PendingOAuth {
                    connection_id: row.get(0)?,
                    session_id: row.get(1)?,
                })
            },
        )
        .ok()
}

pub fn clear_pending_oauth(infra: &SharedInfra) {
    let _ = open(infra).execute("DELETE FROM connector_pending_oauth", []);
}
