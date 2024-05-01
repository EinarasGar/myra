pub struct PageOfResultsDto<T> {
    pub results: Vec<T>,

    pub total_results: i32,
}
