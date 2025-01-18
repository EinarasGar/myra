#![cfg(all(feature = "color-sql", debug_assertions))]

use std::sync::OnceLock;
use syntect::{
    easy::HighlightLines,
    highlighting::{Style, Theme, ThemeSet},
    parsing::{SyntaxReference, SyntaxSet},
};
use tracing_subscriber::{
    field::MakeExt,
    fmt::{format, FormatFields},
};

pub(crate) struct SqlHighlighter {
    syntax: SyntaxReference,
    syntax_set: SyntaxSet,
    theme: Theme,
}
static SQL_H: OnceLock<SqlHighlighter> = OnceLock::new();

impl SqlHighlighter {
    pub(crate) fn get() -> &'static SqlHighlighter {
        SQL_H.get_or_init(SqlHighlighter::new)
    }
    pub(crate) fn new() -> Self {
        let syntax_set = SyntaxSet::load_defaults_newlines();
        let syntax = syntax_set
            .find_syntax_by_extension("sql")
            .expect("SQL not defined")
            .clone();
        let theme = ThemeSet::load_defaults()
            .themes
            .get("base16-ocean.dark")
            .expect("Theme not found.")
            .clone();

        Self {
            syntax,
            syntax_set,
            theme,
        }
    }

    #[tracing::instrument(name = "DEBUG_highlight_sql", skip_all)]
    pub(crate) fn highlight_sql(&self, sql: &str) -> String {
        let mut h = HighlightLines::new(&self.syntax, &self.theme);
        sql.lines()
            .map(|line| {
                let ranges = h.highlight_line(line, &self.syntax_set);
                match ranges {
                    Ok(ranges) => as_terminal_escaped_no_bg(&ranges[..]),
                    Err(_) => line.to_string(),
                }
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}

pub fn create_tracing_formatter() -> impl for<'writer> FormatFields<'writer> {
    format::debug_fn(|writer, field, value| {
        // This code is not nice as it would pick up other params with name "query", plus it doesnt follow sepeartion of concerns
        // as it is in API layer and know about DAL layer.
        // But this is only intended for debugging console logs, so its fine.
        if field.to_string() == "query" {
            let highlighter = SqlHighlighter::get();
            let query = format!("{:?}", value);
            let highlighted_query = highlighter.highlight_sql(&query);
            return write!(writer, "{}: {}", field, highlighted_query);
        } else {
            return write!(writer, "{}: {:?}", field, value);
        }
    })
    .delimited(", ")
}

/// Formats the styled fragments using only foreground 24-bit color terminal escape codes.
fn as_terminal_escaped_no_bg<'a>(ranges: &'a [(Style, &str)]) -> String {
    ranges
        .iter()
        .map(|(style, text)| {
            let fg = style.foreground;
            format!("\x1b[38;2;{};{};{}m{}", fg.r, fg.g, fg.b, text)
        })
        .collect::<String>()
        + "\x1b[0m" // Reset colors at the end
}
