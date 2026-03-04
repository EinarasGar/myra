use std::collections::HashSet;
use std::hash::Hash;

#[allow(dead_code)]
fn get_unique_vec<T>(input: &[T]) -> Vec<T>
where
    T: Eq + Hash + Clone,
{
    // Use a HashSet to store unique Ts
    let mut unique_vals: HashSet<T> = HashSet::new();

    // Filter out duplicates and collect unique ids
    input
        .iter()
        .filter_map(|x| {
            // Insert returns false if the value already exists (i.e., it's a duplicate),
            // so we can use this to filter out duplicates and collect only unique values.
            if unique_vals.insert(x.clone()) {
                Some(x.clone())
            } else {
                None
            }
        })
        .collect()
}
