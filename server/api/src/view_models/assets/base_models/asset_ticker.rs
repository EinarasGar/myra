use serde::{Deserialize, Deserializer, Serialize, Serializer};
use utoipa::ToSchema;

validated_string_type!(
    AssetTicker,
    max_len = 20,
    description = "Asset ticker symbol"
);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn asset_ticker_valid() {
        let result: Result<AssetTicker, _> = serde_json::from_str(r#""BTC""#);
        assert!(result.is_ok());
    }

    #[test]
    fn asset_ticker_over_20_chars_rejected() {
        let long_ticker = "A".repeat(21);
        let json = format!(r#""{}""#, long_ticker);
        let result: Result<AssetTicker, _> = serde_json::from_str(&json);
        assert!(result.is_err());
    }
}
