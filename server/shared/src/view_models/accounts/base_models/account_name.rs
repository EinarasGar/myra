use serde::{Deserialize, Deserializer, Serialize, Serializer};

validated_string_type!(AccountName, max_len = 200, description = "Account name");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_name_valid() {
        let result: Result<AccountName, _> = serde_json::from_str(r#""My Account""#);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_str(), "My Account");
    }

    #[test]
    fn account_name_empty_rejected() {
        let result: Result<AccountName, _> = serde_json::from_str(r#""""#);
        assert!(result.is_err());
    }

    #[test]
    fn account_name_whitespace_only_rejected() {
        let result: Result<AccountName, _> = serde_json::from_str(r#""   ""#);
        assert!(result.is_err());
    }

    #[test]
    fn account_name_over_200_chars_rejected() {
        let long_name = "a".repeat(201);
        let json = format!(r#""{}""#, long_name);
        let result: Result<AccountName, _> = serde_json::from_str(&json);
        assert!(result.is_err());
    }

    #[test]
    fn account_name_trims_whitespace() {
        let result: Result<AccountName, _> = serde_json::from_str(r#""  hello  ""#);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_str(), "hello");
    }

    #[test]
    fn account_name_from_trusted_no_validation() {
        let name = AccountName::from_trusted("  spaces  ".to_string());
        assert_eq!(name.as_str(), "  spaces  ");
    }
}
