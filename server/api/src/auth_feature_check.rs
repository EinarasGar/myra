#[cfg(all(feature = "clerk", feature = "database"))]
compile_error!("Features 'clerk' and 'database' are mutually exclusive. Choose one.");

#[cfg(all(feature = "clerk", feature = "noauth"))]
compile_error!("Features 'clerk' and 'noauth' are mutually exclusive. Choose one.");

#[cfg(all(feature = "database", feature = "noauth"))]
compile_error!("Features 'database' and 'noauth' are mutually exclusive. Choose one.");

#[cfg(not(any(feature = "clerk", feature = "database", feature = "noauth")))]
compile_error!("One of 'clerk', 'database', or 'noauth' feature must be enabled.");
