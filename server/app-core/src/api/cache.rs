use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;

pub struct PersistentCache {
    db: Mutex<Connection>,
}

impl PersistentCache {
    pub fn open(path: &str) -> Self {
        let conn = Connection::open(path).expect("failed to open cache database");
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS response_cache (
                url       TEXT PRIMARY KEY,
                body      TEXT NOT NULL,
                cached_at INTEGER NOT NULL
            )",
        )
        .expect("failed to create cache table");
        Self {
            db: Mutex::new(conn),
        }
    }

    pub fn get(&self, url: &str) -> Option<String> {
        let db = self.db.lock().unwrap();
        db.query_row(
            "SELECT body FROM response_cache WHERE url = ?1",
            [url],
            |row| row.get(0),
        )
        .ok()
    }

    pub fn put(&self, url: &str, body: &str) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let db = self.db.lock().unwrap();
        let _ = db.execute(
            "INSERT OR REPLACE INTO response_cache (url, body, cached_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![url, body, now],
        );
    }

    pub fn clear(&self) {
        let db = self.db.lock().unwrap();
        let _ = db.execute("DELETE FROM response_cache", []);
    }
}
