use proc_macro2::TokenStream;

mod typetag;
mod util;

/// This macro generates a type tag for a struct as part of the OpenAPI schema.
/// It creates a new enum with a single variant that is used as a type tag.
/// The type tag is used for serialization and deserialization as well as for schema generation.
///
/// # Parameters
/// - `value` - the value of the type tag
/// - `tag` - (optional) the name of the field that is used as a tag (default: `"type"`)
///
#[proc_macro_attribute]
pub fn type_tag(
    attr: proc_macro::TokenStream,
    item: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    match typetag::type_tag(attr.into(), &item.clone().into()) {
        Ok(ts) => ts.into(),
        Err(e) => token_stream_with_error(item.into(), e).into(),
    }
}

fn token_stream_with_error(mut tokens: TokenStream, error: syn::Error) -> TokenStream {
    tokens.extend(error.into_compile_error());
    tokens
}
