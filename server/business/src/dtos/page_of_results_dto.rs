pub struct PageOfResultsDto<T> {
    pub results: Vec<T>,

    pub total_results: i32,
}

impl<T> Default for PageOfResultsDto<T> {
    fn default() -> Self {
        Self {
            results: Vec::new(),
            total_results: 0,
        }
    }
}
