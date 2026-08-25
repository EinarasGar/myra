use crate::enablebanking::config::EnableBankingConfig;
use crate::Result;
use jsonwebtoken::{Algorithm, EncodingKey, Header};
use serde::Serialize;

const TOKEN_TTL_SECS: i64 = 3600;

#[derive(Serialize)]
struct Claims {
    iss: &'static str,
    aud: &'static str,
    iat: i64,
    exp: i64,
}

pub fn sign_jwt(now: i64) -> Result<String> {
    let kid = EnableBankingConfig::get()
        .application_id
        .clone()
        .unwrap_or_default();
    encode_token(now, &kid, &encoding_key()?)
}

fn encode_token(now: i64, kid: &str, key: &EncodingKey) -> Result<String> {
    let claims = Claims {
        iss: "enablebanking.com",
        aud: "api.enablebanking.com",
        iat: now,
        exp: now + TOKEN_TTL_SECS,
    };
    let mut header = Header::new(Algorithm::RS256);
    header.kid = Some(kid.to_string());
    Ok(jsonwebtoken::encode(&header, &claims, key)?)
}

pub fn encoding_key() -> Result<EncodingKey> {
    let pem = EnableBankingConfig::get()
        .private_key
        .as_deref()
        .ok_or_else(|| anyhow::anyhow!("ENABLEBANKING_PRIVATE_KEY not configured"))?;
    encoding_key_from_pem(pem)
}

fn encoding_key_from_pem(pem: &str) -> Result<EncodingKey> {
    EncodingKey::from_rsa_pem(pem.as_bytes())
        .map_err(|e| anyhow::anyhow!("invalid ENABLEBANKING_PRIVATE_KEY PEM: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;
    use serde_json::Value;

    const TEST_PEM: &str = "-----BEGIN PRIVATE KEY-----
MIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAKi7GW+2qUChItZj
g8V9SkJmlHj6f9gJgNt2a9QJsbjfj6P47uJujVgi9ITty9bBB5yqnmYw1GlU64nj
VVWlQn14Oj1DFEZGkCUFn1+1yFQi/6FmSTyPRwGDMx2ZgdS0MwpEvewOgnJQKADB
cjpVO9bPsrrlP+9a+Cq6BQUaXwexAgMBAAECgYB/jjIEigoZmbdEa6bKPZVN7U6A
xp6vK0AGqNeLTGjWYeutAhtVgk3IO2SuuTZH+1VN0o48ot1xY4lMjFeOj4hbJ3z9
I1atdVXvxZmUZ4cSumseCXlaW/5+i/EqrHH6kk1rEzH53IltBQFIe8smrJgMe/+2
AnulVhpUJo8mTCHVoQJBANelcQPy7sikgnVFPEOJHCUHtlo9HNBDa4mgh1p4kbLo
IlJ6wfbsP+crYqLSbCd4d6KKLXIkznVBoE0paWadyXMCQQDITiub/qfptbSG9izd
ijE/FdgCIS+iHXMdfvV/vvFiOlfs0jSkCGcqChCt9k+bMFSdU0jcN6bnHsfuGgCB
kjFLAkEAibjIT8xTweKGytx3223ygpfFVyZWg4+7Wz8hkp8T9h2Y5fIudEN3oGyt
5uzaU+71AOKcmZx2Gp7aAM2k2fuFjwJBAIxk9f4FtM2DlYAPJg01oiTUe62qcweO
2rOu3AXo4Kl3uU79WvYqCZ0WpvA3tz5P1s7apDPuMebG1V1XDknDHRcCQQCo/QqC
MV3dz8ReO4MH62K2aExJ9Bi8/Wo7KewdN/rOXJPWnXC2/fFMQRAc/TFZDjl05GyP
LzArwzHDjMfKxMmp
-----END PRIVATE KEY-----";

    fn b64url_decode(segment: &str) -> Value {
        let decoded = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(segment)
            .unwrap();
        serde_json::from_slice(&decoded).unwrap()
    }

    fn test_key() -> EncodingKey {
        EncodingKey::from_rsa_pem(TEST_PEM.as_bytes()).unwrap()
    }

    #[test]
    fn jwt_header_carries_rs256_and_kid() {
        let token =
            encode_token(1_700_000_000, "app-uuid-123", &test_key()).unwrap();
        let header = b64url_decode(token.split('.').next().unwrap());
        assert_eq!(header["alg"], "RS256");
        assert_eq!(header["kid"], "app-uuid-123");
    }

    #[test]
    fn jwt_claims_match_enablebanking_contract() {
        let token = encode_token(1_700_000_000, "kid", &test_key()).unwrap();
        let parts: Vec<&str> = token.split('.').collect();
        let claims = b64url_decode(parts[1]);
        assert_eq!(claims["iss"], "enablebanking.com");
        assert_eq!(claims["aud"], "api.enablebanking.com");
        assert_eq!(claims["iat"], 1_700_000_000);
        assert_eq!(claims["exp"], 1_700_003_600);
    }

    #[test]
    fn invalid_pem_errors() {
        assert!(encoding_key_from_pem("not a pem").is_err());
    }

    #[test]
    fn valid_pem_loads() {
        assert!(encoding_key_from_pem(TEST_PEM).is_ok());
    }
}
