use crate::models::rate_limit_models::{
    GlobalTokenRateLimitModel, GlobalTokenUsageModel, TokenRateLimitModel, TokenUsageModel,
};
use crate::redis_connection::RedisScript;
use once_cell::sync::Lazy;
use uuid::Uuid;

const HOURLY_TTL: i64 = 7200;
const MONTHLY_TTL: i64 = 2764800;
const INFLIGHT_TTL: i64 = 300;
const CONFIG_DEFAULT_KEY: &str = "ai:rl:config:default";
const CONFIG_GLOBAL_KEY: &str = "ai:rl:config:global";

const MAX_CONCURRENT_REQUESTS: i64 = 2;

static CHECK_SCRIPT: Lazy<redis::Script> = Lazy::new(|| redis::Script::new(CHECK_AND_RESERVE_LUA));
static DEDUCT_SCRIPT: Lazy<redis::Script> = Lazy::new(|| redis::Script::new(DEDUCT_USAGE_LUA));
static RELEASE_SCRIPT: Lazy<redis::Script> =
    Lazy::new(|| redis::Script::new(RELEASE_RESERVATION_LUA));
static CONCURRENCY_SCRIPT: Lazy<redis::Script> =
    Lazy::new(|| redis::Script::new(ACQUIRE_CONCURRENCY_LUA));

pub fn max_concurrent_requests() -> i64 {
    MAX_CONCURRENT_REQUESTS
}

pub fn check_and_reserve(
    user_id: Uuid,
    hourly_key: &str,
    monthly_key: &str,
    estimated_input_tokens: i64,
) -> RedisScript {
    let keys = build_usage_keys(user_id, hourly_key, monthly_key);
    RedisScript::new(&CHECK_SCRIPT)
        .key(&keys[0])
        .key(&keys[1])
        .key(&keys[2])
        .key(&keys[3])
        .key(&keys[4])
        .key(&keys[5])
        .key(&keys[6])
        .key(&keys[7])
        .key(format!("ai:rl:config:user:{}", user_id))
        .key(CONFIG_DEFAULT_KEY)
        .key(CONFIG_GLOBAL_KEY)
        .arg_int(estimated_input_tokens)
        .arg_int(HOURLY_TTL)
        .arg_int(MONTHLY_TTL)
}

pub fn release_reservation(
    user_id: Uuid,
    hourly_key: &str,
    monthly_key: &str,
    estimated_input_tokens: i64,
) -> RedisScript {
    let keys = build_usage_keys(user_id, hourly_key, monthly_key);
    RedisScript::new(&RELEASE_SCRIPT)
        .key(&keys[0])
        .key(&keys[2])
        .key(&keys[4])
        .key(&keys[6])
        .arg_int(estimated_input_tokens)
}

pub fn acquire_concurrency(user_id: Uuid) -> RedisScript {
    RedisScript::new(&CONCURRENCY_SCRIPT)
        .key(format!("ai:rl:user:{}:inflight", user_id))
        .arg_int(INFLIGHT_TTL)
}

pub fn concurrency_key(user_id: Uuid) -> String {
    format!("ai:rl:user:{}:inflight", user_id)
}

pub fn deduct_usage(
    user_id: Uuid,
    hourly_key: &str,
    monthly_key: &str,
    input_adjustment: i64,
    output_tokens: i64,
) -> RedisScript {
    let keys = build_usage_keys(user_id, hourly_key, monthly_key);
    RedisScript::new(&DEDUCT_SCRIPT)
        .key(&keys[0])
        .key(&keys[1])
        .key(&keys[2])
        .key(&keys[3])
        .key(&keys[4])
        .key(&keys[5])
        .key(&keys[6])
        .key(&keys[7])
        .key(CONFIG_GLOBAL_KEY)
        .arg_int(input_adjustment)
        .arg_int(output_tokens)
        .arg_int(HOURLY_TTL)
        .arg_int(MONTHLY_TTL)
}

pub fn seed_user_usage(usage: &TokenUsageModel) -> (String, i64, String, i64, u64) {
    let ttl = if usage.window_type == "hourly" {
        HOURLY_TTL as u64
    } else {
        MONTHLY_TTL as u64
    };
    (
        format!(
            "ai:rl:user:{}:{}:{}:input",
            usage.user_id, usage.window_type, usage.window_key
        ),
        usage.input_tokens,
        format!(
            "ai:rl:user:{}:{}:{}:output",
            usage.user_id, usage.window_type, usage.window_key
        ),
        usage.output_tokens,
        ttl,
    )
}

pub fn seed_global_usage(usage: &GlobalTokenUsageModel) -> (String, i64, String, i64, u64) {
    let ttl = if usage.window_type == "hourly" {
        HOURLY_TTL as u64
    } else {
        MONTHLY_TTL as u64
    };
    (
        format!(
            "ai:rl:global:{}:{}:input",
            usage.window_type, usage.window_key
        ),
        usage.input_tokens,
        format!(
            "ai:rl:global:{}:{}:output",
            usage.window_type, usage.window_key
        ),
        usage.output_tokens,
        ttl,
    )
}

pub fn seed_config(limits: &TokenRateLimitModel) -> (String, [(&'static str, i64); 4], i64) {
    let key = match limits.user_id {
        Some(uid) => format!("ai:rl:config:user:{}", uid),
        None => CONFIG_DEFAULT_KEY.to_string(),
    };
    (
        key,
        [
            ("hourly_input", limits.hourly_input_tokens),
            ("hourly_output", limits.hourly_output_tokens),
            ("monthly_input", limits.monthly_input_tokens),
            ("monthly_output", limits.monthly_output_tokens),
        ],
        MONTHLY_TTL,
    )
}

pub fn seed_global_config(
    limits: &GlobalTokenRateLimitModel,
) -> (&'static str, [(&'static str, i64); 4], i64) {
    (
        CONFIG_GLOBAL_KEY,
        [
            ("hourly_input", limits.hourly_input_tokens),
            ("hourly_output", limits.hourly_output_tokens),
            ("monthly_input", limits.monthly_input_tokens),
            ("monthly_output", limits.monthly_output_tokens),
        ],
        MONTHLY_TTL,
    )
}

/// [0]=user hourly input, [1]=user hourly output, [2]=user monthly input, [3]=user monthly output
/// [4]=global hourly input, [5]=global hourly output, [6]=global monthly input, [7]=global monthly output
fn build_usage_keys(user_id: Uuid, hourly_key: &str, monthly_key: &str) -> [String; 8] {
    [
        format!("ai:rl:user:{}:hourly:{}:input", user_id, hourly_key),
        format!("ai:rl:user:{}:hourly:{}:output", user_id, hourly_key),
        format!("ai:rl:user:{}:monthly:{}:input", user_id, monthly_key),
        format!("ai:rl:user:{}:monthly:{}:output", user_id, monthly_key),
        format!("ai:rl:global:hourly:{}:input", hourly_key),
        format!("ai:rl:global:hourly:{}:output", hourly_key),
        format!("ai:rl:global:monthly:{}:input", monthly_key),
        format!("ai:rl:global:monthly:{}:output", monthly_key),
    ]
}

const CHECK_AND_RESERVE_LUA: &str = r#"
local fields = {'hourly_input', 'hourly_output', 'monthly_input', 'monthly_output'}
local user_lims = redis.call('HMGET', KEYS[9], unpack(fields))
if not user_lims[1] then
    user_lims = redis.call('HMGET', KEYS[10], unpack(fields))
end
local global_lims = redis.call('HMGET', KEYS[11], unpack(fields))

local limits = {}
for i = 1, 4 do
    limits[i] = tonumber(user_lims[i])
    limits[i + 4] = tonumber(global_lims[i])
end
for i = 1, 8 do
    if not limits[i] then return 'reseed' end
end

local scopes = {'user', 'user', 'user', 'user', 'global', 'global', 'global', 'global'}
local windows = {'hourly', 'hourly', 'monthly', 'monthly', 'hourly', 'hourly', 'monthly', 'monthly'}
local types = {'input', 'output', 'input', 'output', 'input', 'output', 'input', 'output'}

local est_input = tonumber(ARGV[1])
local hourly_ttl = tonumber(ARGV[2])
local monthly_ttl = tonumber(ARGV[3])
local ttls = {hourly_ttl, hourly_ttl, monthly_ttl, monthly_ttl, hourly_ttl, hourly_ttl, monthly_ttl, monthly_ttl}

local reserved = {}
for _, i in ipairs({1, 3, 5, 7}) do
    reserved[i] = redis.call('INCRBY', KEYS[i], est_input)
    redis.call('EXPIRE', KEYS[i], ttls[i])
end

for i = 1, 8 do
    local current
    if i == 1 or i == 3 or i == 5 or i == 7 then
        current = reserved[i]
    else
        current = tonumber(redis.call('GET', KEYS[i]) or '0')
    end
    if current > limits[i] then
        for _, j in ipairs({1, 3, 5, 7}) do
            redis.call('DECRBY', KEYS[j], est_input)
        end
        return scopes[i] .. ':' .. windows[i] .. ':' .. types[i] .. ':' .. tostring(limits[i])
    end
end
return 'ok'
"#;

const DEDUCT_USAGE_LUA: &str = r#"
local input_adj = tonumber(ARGV[1])
local output = tonumber(ARGV[2])
local hourly_ttl = tonumber(ARGV[3])
local monthly_ttl = tonumber(ARGV[4])

redis.call('INCRBY', KEYS[1], input_adj)
redis.call('EXPIRE', KEYS[1], hourly_ttl)
redis.call('INCRBY', KEYS[3], input_adj)
redis.call('EXPIRE', KEYS[3], monthly_ttl)
local g_hi = redis.call('INCRBY', KEYS[5], input_adj)
redis.call('EXPIRE', KEYS[5], hourly_ttl)
local g_mi = redis.call('INCRBY', KEYS[7], input_adj)
redis.call('EXPIRE', KEYS[7], monthly_ttl)

redis.call('INCRBY', KEYS[2], output)
redis.call('EXPIRE', KEYS[2], hourly_ttl)
redis.call('INCRBY', KEYS[4], output)
redis.call('EXPIRE', KEYS[4], monthly_ttl)
local g_ho = redis.call('INCRBY', KEYS[6], output)
redis.call('EXPIRE', KEYS[6], hourly_ttl)
local g_mo = redis.call('INCRBY', KEYS[8], output)
redis.call('EXPIRE', KEYS[8], monthly_ttl)

local fields = {'hourly_input', 'hourly_output', 'monthly_input', 'monthly_output'}
local gl = redis.call('HMGET', KEYS[9], unpack(fields))
return {g_hi, g_ho, g_mi, g_mo, tonumber(gl[1]) or 0, tonumber(gl[2]) or 0, tonumber(gl[3]) or 0, tonumber(gl[4]) or 0}
"#;

const RELEASE_RESERVATION_LUA: &str = r#"
local est_input = tonumber(ARGV[1])
for i = 1, 4 do
    redis.call('DECRBY', KEYS[i], est_input)
end
return 'ok'
"#;

const ACQUIRE_CONCURRENCY_LUA: &str = r#"
local count = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
return count
"#;
