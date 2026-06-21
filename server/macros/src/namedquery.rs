use proc_macro2::TokenStream;
use quote::quote;
use syn::{ItemFn, ReturnType};

pub fn named_query(item: &TokenStream) -> syn::Result<TokenStream> {
    let func: ItemFn = syn::parse2(item.clone())?;

    let name = func.sig.ident.to_string();
    let ret_type = match &func.sig.output {
        ReturnType::Type(_, ty) => ty,
        ReturnType::Default => {
            return Err(syn::Error::new_spanned(
                &func.sig,
                "named_query requires an explicit return type",
            ))
        }
    };

    let attrs = &func.attrs;
    let vis = &func.vis;
    let sig = &func.sig;
    let block = &func.block;

    Ok(quote! {
        #(#attrs)*
        #vis #sig {
            (|| -> #ret_type #block)().named(#name)
        }
    })
}
