use mockall::mock;
use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(2);
const COMMAND_TIMEOUT: Duration = Duration::from_secs(2);

pub struct RedisScript {
    script: &'static redis::Script,
    keys: Vec<String>,
    args: Vec<RedisArg>,
}

enum RedisArg {
    Int(i64),
    Str(String),
}

impl RedisScript {
    pub fn new(script: &'static redis::Script) -> Self {
        Self {
            script,
            keys: Vec::new(),
            args: Vec::new(),
        }
    }

    pub fn key(mut self, key: impl Into<String>) -> Self {
        self.keys.push(key.into());
        self
    }

    pub fn arg_int(mut self, val: i64) -> Self {
        self.args.push(RedisArg::Int(val));
        self
    }

    pub fn arg_str(mut self, val: impl Into<String>) -> Self {
        self.args.push(RedisArg::Str(val.into()));
        self
    }
}

#[derive(Clone)]
pub struct RedisConnection {
    client: Option<redis::Client>,
    manager: Arc<RwLock<Option<ConnectionManager>>>,
}

impl RedisConnection {
    pub async fn new() -> Self {
        let url = match std::env::var("REDIS_URL") {
            Ok(url) => url,
            Err(_) => {
                tracing::warn!("REDIS_URL not set, rate limiting will use DB-only mode");
                return Self {
                    client: None,
                    manager: Arc::new(RwLock::new(None)),
                };
            }
        };
        let client = match redis::Client::open(url) {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("Failed to parse Redis URL: {}", e);
                return Self {
                    client: None,
                    manager: Arc::new(RwLock::new(None)),
                };
            }
        };

        let conn = Self {
            client: Some(client),
            manager: Arc::new(RwLock::new(None)),
        };

        if conn.get_connection().await.is_some() {
            tracing::info!("Connected to Redis");
        } else {
            tracing::warn!("Redis unavailable at startup, will retry on first request");
        }

        conn
    }

    pub async fn execute_script_string(&self, cmd: RedisScript) -> Option<String> {
        let mut conn = self.get_connection().await?;
        let fut = async {
            let mut invocation = cmd.script.prepare_invoke();
            for key in &cmd.keys {
                invocation.key(key);
            }
            for arg in &cmd.args {
                match arg {
                    RedisArg::Int(v) => {
                        invocation.arg(*v);
                    }
                    RedisArg::Str(v) => {
                        invocation.arg(v.as_str());
                    }
                }
            }
            invocation.invoke_async::<String>(&mut conn).await
        };
        match tokio::time::timeout(COMMAND_TIMEOUT, fut).await {
            Ok(Ok(val)) => Some(val),
            Ok(Err(e)) => {
                tracing::warn!("Redis script failed: {}", e);
                None
            }
            Err(_) => {
                tracing::warn!("Redis script timed out");
                None
            }
        }
    }

    pub async fn execute_script_vec(&self, cmd: RedisScript) -> Option<Vec<i64>> {
        let mut conn = self.get_connection().await?;
        let fut = async {
            let mut invocation = cmd.script.prepare_invoke();
            for key in &cmd.keys {
                invocation.key(key);
            }
            for arg in &cmd.args {
                match arg {
                    RedisArg::Int(v) => {
                        invocation.arg(*v);
                    }
                    RedisArg::Str(v) => {
                        invocation.arg(v.as_str());
                    }
                }
            }
            invocation.invoke_async::<Vec<i64>>(&mut conn).await
        };
        match tokio::time::timeout(COMMAND_TIMEOUT, fut).await {
            Ok(Ok(val)) => Some(val),
            Ok(Err(e)) => {
                tracing::warn!("Redis script failed: {}", e);
                None
            }
            Err(_) => {
                tracing::warn!("Redis script timed out");
                None
            }
        }
    }

    pub async fn execute_script_int(&self, cmd: RedisScript) -> Option<i64> {
        let mut conn = self.get_connection().await?;
        let fut = async {
            let mut invocation = cmd.script.prepare_invoke();
            for key in &cmd.keys {
                invocation.key(key);
            }
            for arg in &cmd.args {
                match arg {
                    RedisArg::Int(v) => {
                        invocation.arg(*v);
                    }
                    RedisArg::Str(v) => {
                        invocation.arg(v.as_str());
                    }
                }
            }
            invocation.invoke_async::<i64>(&mut conn).await
        };
        match tokio::time::timeout(COMMAND_TIMEOUT, fut).await {
            Ok(Ok(val)) => Some(val),
            Ok(Err(e)) => {
                tracing::warn!("Redis script failed: {}", e);
                None
            }
            Err(_) => {
                tracing::warn!("Redis script timed out");
                None
            }
        }
    }

    pub async fn set_ex(&self, key: &str, value: i64, ttl_secs: u64) {
        if let Some(mut conn) = self.get_connection().await {
            let _ = tokio::time::timeout(COMMAND_TIMEOUT, async {
                let _: Result<(), _> = conn.set_ex(key, value, ttl_secs).await;
            })
            .await;
        }
    }

    pub async fn hset_with_expire(&self, key: &str, fields: &[(&str, i64)], ttl_secs: i64) {
        if let Some(mut conn) = self.get_connection().await {
            let _ = tokio::time::timeout(COMMAND_TIMEOUT, async {
                let _: Result<(), _> = conn.hset_multiple(key, fields).await;
                let _: Result<bool, _> = conn.expire::<_, bool>(key, ttl_secs).await;
            })
            .await;
        }
    }

    pub async fn decr(&self, key: &str) {
        if let Some(mut conn) = self.get_connection().await {
            let _ = tokio::time::timeout(COMMAND_TIMEOUT, async {
                let _: Result<i64, _> = conn.decr(key, 1i64).await;
            })
            .await;
        }
    }

    pub(crate) async fn get_connection(&self) -> Option<ConnectionManager> {
        let client = self.client.as_ref()?;

        // Fast path: cached manager
        {
            let cached = self.manager.read().await;
            if let Some(mgr) = cached.as_ref() {
                return Some(mgr.clone());
            }
        }

        // Slow path: try to connect
        let mut lock = self.manager.write().await;
        if let Some(mgr) = lock.as_ref() {
            return Some(mgr.clone());
        }

        match tokio::time::timeout(CONNECT_TIMEOUT, ConnectionManager::new(client.clone())).await {
            Ok(Ok(mgr)) => {
                *lock = Some(mgr.clone());
                Some(mgr)
            }
            Ok(Err(e)) => {
                tracing::warn!("Failed to connect to Redis: {}", e);
                None
            }
            Err(_) => {
                tracing::warn!("Redis connection timed out");
                None
            }
        }
    }
}

mock! {
    pub RedisConnection {
        pub async fn new() -> Self;
        pub async fn execute_script_string(&self, cmd: RedisScript) -> Option<String>;
        pub async fn execute_script_vec(&self, cmd: RedisScript) -> Option<Vec<i64>>;
        pub async fn execute_script_int(&self, cmd: RedisScript) -> Option<i64>;
        pub async fn set_ex(&self, key: &str, value: i64, ttl_secs: u64);
        pub async fn hset_with_expire(&self, key: &str, fields: &[(&'static str, i64)], ttl_secs: i64);
        pub async fn decr(&self, key: &str);
    }

    impl Clone for RedisConnection {
        fn clone(&self) -> Self;
    }
}
