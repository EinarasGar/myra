use crate::errors::FieldError;
use crate::view_models::ai::conversations::SendMessageRequestViewModel;
use crate::view_models::transactions::validation::Validatable;

impl Validatable for SendMessageRequestViewModel {
    fn validate(&self) -> Result<(), Vec<FieldError>> {
        let has_message = self
            .message
            .as_ref()
            .map(|m| !m.is_empty())
            .unwrap_or(false);
        let has_files = !self.file_ids.is_empty();
        let has_approval = self.tool_approval.is_some();

        if !has_message && !has_files && !has_approval {
            return Err(vec![FieldError {
                field: "message".to_string(),
                message: "Either message, file_ids, or tool_approval must be provided.".to_string(),
            }]);
        }

        Ok(())
    }
}
