use std::fs;

use api::openapi::ApiDoc;
use utoipa::OpenApi;

fn main() {
    let doc = ApiDoc::openapi().to_pretty_json().unwrap();
    fs::write("./OpenApi.json", doc).unwrap();
}
