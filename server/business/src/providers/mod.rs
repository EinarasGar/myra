//! Adapters that implement traits exposed by the `ai` crate. These types
//! exist to satisfy ports defined upstream — they hold service references
//! and translate trait calls into business-layer operations. Distinct from
//! `service_collection/` (stateless services) and `entities/` (pure domain
//! objects with in-memory state).

pub mod user_action_provider;
pub mod user_conversation_provider;
pub mod user_data_provider;
pub mod user_rate_limiter;
