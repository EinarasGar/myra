#[derive(Debug, Clone)]
pub struct DependencyCheckResult {
    pub has_dependencies: bool,
    pub dependency_count: u32,
    pub dependency_type: Option<String>,
}

#[derive(Debug, Clone)]
pub enum CategoryError {
    NotFound,
    Unauthorized,
    DuplicateName(String),
    InvalidIcon(String),
    InvalidType,
    LimitExceeded { limit: u32, current: u32 },
    HasDependencies(DependencyCheckResult),
    SystemCategoryImmutable,
    ValidationError(String),
}

impl std::fmt::Display for CategoryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CategoryError::NotFound => write!(f, "Category not found"),
            CategoryError::Unauthorized => write!(f, "Unauthorized access to category"),
            CategoryError::DuplicateName(name) => {
                write!(f, "Category with name '{}' already exists", name)
            }
            CategoryError::InvalidIcon(icon) => write!(f, "Invalid icon: {}", icon),
            CategoryError::InvalidType => write!(f, "Invalid category type"),
            CategoryError::LimitExceeded { limit, current } => {
                write!(
                    f,
                    "Category limit exceeded: {}/{} categories",
                    current, limit
                )
            }
            CategoryError::HasDependencies(result) => {
                write!(
                    f,
                    "Cannot delete category: has {} dependencies of type {:?}",
                    result.dependency_count, result.dependency_type
                )
            }
            CategoryError::SystemCategoryImmutable => {
                write!(f, "System categories cannot be modified")
            }
            CategoryError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
        }
    }
}

impl std::error::Error for CategoryError {}
