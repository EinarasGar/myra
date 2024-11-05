use std::{collections::HashMap, sync::Mutex};

use once_cell::sync::Lazy;
use thiserror::Error;

use crate::loader::Loader;

pub mod fee_categories;
pub mod transaction_type_categories;

#[derive(Error, Debug, PartialEq)]
pub enum DynamicEnumError {
    #[error("Dynamic enum not loaded")]
    NotLoaded,

    #[error("Value not fond")]
    NotFound,
}

pub trait DynamicEnum<K, V>
where
    K: Eq + std::hash::Hash + Clone + 'static,
    V: PartialEq + Clone + 'static,
{
    fn get_static_map() -> &'static Lazy<Mutex<Option<HashMap<K, V>>>>;
    fn set_static_map(map: Option<HashMap<K, V>>);

    fn try_from_dynamic_enum(value: V) -> Result<K, DynamicEnumError> {
        let map = Self::get_static_map().lock().unwrap();
        map.as_ref()
            .and_then(|m| m.iter().find(|(_, v)| **v == value).map(|(k, _)| k.clone()))
            .ok_or_else(|| {
                if map.is_some() {
                    DynamicEnumError::NotFound
                } else {
                    DynamicEnumError::NotLoaded
                }
            })
    }

    fn try_into_dynamic_enum(value: K) -> Result<V, DynamicEnumError> {
        let map = Self::get_static_map().lock().unwrap();
        map.as_ref()
            .and_then(|m| m.get(&value).cloned())
            .ok_or_else(|| {
                if map.is_some() {
                    DynamicEnumError::NotFound
                } else {
                    DynamicEnumError::NotLoaded
                }
            })
    }
}

pub fn get_all_dynamic_enum_loaders() -> Vec<Box<dyn Loader + Send + Sync>> {
    vec![
        Box::new(fee_categories::FeeCategories),
        Box::new(transaction_type_categories::TransactionTypeCategories),
    ]
}

#[cfg(test)]
mod tests {
    use crate::dynamic_enums::DynamicEnumError;

    use super::*;

    static STATIC_ENUM: Lazy<Mutex<Option<HashMap<FooEnum, i32>>>> = Lazy::new(|| Mutex::new(None));

    pub struct FooDynamicEnum;

    #[derive(Clone, Debug, PartialEq, Eq, Hash)]
    #[repr(i32)]
    pub enum FooEnum {
        Bar = 1,
        Biz = 2,
    }

    impl DynamicEnum<FooEnum, i32> for FooDynamicEnum {
        fn get_static_map() -> &'static Lazy<Mutex<Option<HashMap<FooEnum, i32>>>> {
            &STATIC_ENUM
        }

        fn set_static_map(map: Option<HashMap<FooEnum, i32>>) {
            let mut static_map = STATIC_ENUM.lock().unwrap();
            *static_map = map;
        }
    }

    fn setup_enum() {
        let mut map = STATIC_ENUM.lock().unwrap();
        let mut m = HashMap::new();
        m.insert(FooEnum::Bar, 2);
        *map = Some(m);
    }

    fn teardown_enum() {
        let mut map = STATIC_ENUM.lock().unwrap();
        *map = None;
    }

    #[test]
    fn test_try_from_dynamic_enum_found() {
        setup_enum();
        let enum_value = FooDynamicEnum::try_from_dynamic_enum(2);
        teardown_enum();
        assert_eq!(enum_value.unwrap(), FooEnum::Bar);
    }

    #[test]
    fn test_try_from_dynamic_enum_not_found() {
        setup_enum();
        let enum_value = FooDynamicEnum::try_from_dynamic_enum(1);
        teardown_enum();
        assert_eq!(enum_value.unwrap_err(), DynamicEnumError::NotFound);
    }

    #[test]
    fn test_try_from_dynamic_enum_not_loaded() {
        let enum_value = FooDynamicEnum::try_from_dynamic_enum(1);
        assert_eq!(enum_value.unwrap_err(), DynamicEnumError::NotLoaded);
    }

    #[test]
    fn test_try_into_dynamic_enum_found() {
        setup_enum();
        let int_value = FooDynamicEnum::try_into_dynamic_enum(FooEnum::Bar);
        teardown_enum();
        assert_eq!(int_value.unwrap(), 2);
    }

    #[test]
    fn test_try_into_dynamic_enum_not_found() {
        setup_enum();
        let int_value = FooDynamicEnum::try_into_dynamic_enum(FooEnum::Biz);
        teardown_enum();
        assert_eq!(int_value.unwrap_err(), DynamicEnumError::NotFound);
    }

    #[test]
    fn test_try_into_dynamic_enum_not_loaded() {
        let int_value = FooDynamicEnum::try_into_dynamic_enum(FooEnum::Bar);
        assert_eq!(int_value.unwrap_err(), DynamicEnumError::NotLoaded);
    }
}
