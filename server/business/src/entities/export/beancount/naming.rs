use std::collections::{HashMap, HashSet};

use uuid::Uuid;

use crate::entities::export::LedgerExport;

pub struct Naming {
    account_names: HashMap<Uuid, String>,
    commodity_names: HashMap<i32, String>,
}

impl Naming {
    pub fn build(export: &LedgerExport) -> Self {
        let mut account_names = HashMap::new();
        let mut seen_accounts: HashSet<String> = HashSet::new();
        for account in &export.accounts {
            let root = if is_liability(&account.account_type_name) {
                "Liabilities"
            } else {
                "Assets"
            };
            let base = format!("{}:{}", root, sanitize_component(&account.name));
            let suffix = short_suffix(&account.id.simple().to_string());
            let name = dedupe(&mut seen_accounts, base, &suffix);
            account_names.insert(account.id, name);
        }

        let mut commodity_names = HashMap::new();
        let mut seen_commodities: HashSet<String> = HashSet::new();
        for asset in &export.assets {
            let base = if asset.asset_type_name.eq_ignore_ascii_case("currency") {
                asset.ticker.to_uppercase()
            } else {
                commodity_sanitize(&asset.ticker)
            };
            let name = dedupe_commodity(&mut seen_commodities, base, asset.id);
            commodity_names.insert(asset.id, name);
        }

        Self {
            account_names,
            commodity_names,
        }
    }

    pub fn account(&self, id: &Uuid) -> String {
        self.account_names
            .get(id)
            .cloned()
            .unwrap_or_else(|| "Assets:Unknown".to_string())
    }

    pub fn commodity(&self, id: i32) -> String {
        self.commodity_names
            .get(&id)
            .cloned()
            .unwrap_or_else(|| "UNKNOWN".to_string())
    }
}

fn is_liability(account_type: &str) -> bool {
    matches!(
        account_type.to_ascii_lowercase().as_str(),
        "credit" | "mortgage" | "loan"
    )
}

fn short_suffix(id: &str) -> String {
    id.chars().take(6).collect()
}

fn dedupe(seen: &mut HashSet<String>, base: String, suffix: &str) -> String {
    let candidate = if seen.contains(&base) {
        format!("{}-{}", base, suffix)
    } else {
        base
    };
    let mut name = candidate.clone();
    let mut n = 1;
    while seen.contains(&name) {
        name = format!("{}-{}", candidate, n);
        n += 1;
    }
    seen.insert(name.clone());
    name
}

fn dedupe_commodity(seen: &mut HashSet<String>, base: String, id: i32) -> String {
    if !seen.contains(&base) {
        seen.insert(base.clone());
        return base;
    }
    let mut candidate = clamp_commodity(&format!("{}-{}", base, id));
    let mut n = 1;
    while seen.contains(&candidate) {
        candidate = clamp_commodity(&format!("{}-{}-{}", base, id, n));
        n += 1;
    }
    seen.insert(candidate.clone());
    candidate
}

pub fn sanitize_component(s: &str) -> String {
    let mut words: Vec<String> = Vec::new();
    let mut current = String::new();
    for ch in s.chars() {
        if ch.is_alphanumeric() {
            current.push(ch);
        } else if !current.is_empty() {
            words.push(std::mem::take(&mut current));
        }
    }
    if !current.is_empty() {
        words.push(current);
    }

    let mut out = String::new();
    for (i, word) in words.iter().enumerate() {
        if i > 0 {
            out.push('-');
        }
        let mut chars = word.chars();
        if let Some(first) = chars.next() {
            out.extend(first.to_uppercase());
            out.push_str(chars.as_str());
        }
    }

    if out.is_empty() {
        return "X".to_string();
    }
    let first = out.chars().next().unwrap();
    if !(first.is_ascii_uppercase() || first.is_ascii_digit()) {
        out.insert(0, 'X');
    }
    out
}

pub fn ticker_component(ticker: &str) -> String {
    let upper = ticker.to_uppercase();
    let mut s: String = upper
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    while s.starts_with('-') {
        s.remove(0);
    }
    while s.ends_with('-') {
        s.pop();
    }
    if s.is_empty() || !s.chars().next().unwrap().is_ascii_alphanumeric() {
        s.insert(0, 'X');
    }
    s
}

fn commodity_sanitize(ticker: &str) -> String {
    let upper = ticker.to_uppercase();
    let mapped: String = upper
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '-'
            }
        })
        .collect();
    clamp_commodity(&mapped)
}

fn clamp_commodity(s: &str) -> String {
    let mut out = s.to_string();
    while let Some(first) = out.chars().next() {
        if first.is_ascii_alphabetic() {
            break;
        }
        out.remove(0);
    }
    trim_trailing(&mut out);
    if out.chars().count() > 24 {
        out = out.chars().take(24).collect();
        trim_trailing(&mut out);
    }
    if out.is_empty() {
        out.push('X');
    }
    out
}

fn trim_trailing(s: &mut String) {
    while let Some(last) = s.chars().last() {
        if last.is_ascii_alphanumeric() {
            break;
        }
        s.pop();
    }
}
