use derivative::Derivative;

#[derive(Derivative, Debug)]
pub enum MetadataField {
    Description(Option<String>),
    Dividends(Option<i32>),
}
