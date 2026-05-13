use ai::conversation_provider::{ConversationProvider, HistoryEntry};
use ai::models::chat::{Base64Image, ChatHistoryMessage};
use futures::{Stream, StreamExt};
use tokio::sync::{broadcast, oneshot};
use uuid::Uuid;

use crate::dtos::ai_chat_dto::{ChatHistoryMessageDto, ChatStreamEventDto};
use crate::service_collection::ai_conversation_service::AiConversationService;
use crate::service_collection::file_service::FileService;
use crate::service_collection::ServiceProviders;

const EVENT_CHANNEL_CAPACITY: usize = 64;

#[derive(Clone)]
pub struct UserConversationProvider {
    user_id: Uuid,
    conversation_id: Uuid,
    conv_service: AiConversationService,
    providers: ServiceProviders,
}

impl UserConversationProvider {
    /// Verify ownership and open a conversation handle.
    pub async fn open(
        providers: &ServiceProviders,
        user_id: Uuid,
        conversation_id: Uuid,
    ) -> anyhow::Result<Self> {
        let conv_service = AiConversationService::new(providers);
        conv_service
            .ensure_owns_conversation(conversation_id, user_id)
            .await?;
        Ok(Self {
            user_id,
            conversation_id,
            conv_service,
            providers: providers.clone(),
        })
    }

    pub fn user_id(&self) -> Uuid {
        self.user_id
    }

    pub fn conversation_id(&self) -> Uuid {
        self.conversation_id
    }

    pub fn drive_stream<S>(&self, stream: S) -> ConversationStreamHandle
    where
        S: Stream<Item = ChatStreamEventDto> + Send + 'static,
    {
        let (event_tx, _) = broadcast::channel(EVENT_CHANNEL_CAPACITY);
        let (completion_tx, completion_rx) = oneshot::channel();
        let task_event_tx = event_tx.clone();

        tokio::spawn(async move {
            let mut stream = std::pin::pin!(stream);
            while let Some(event) = stream.next().await {
                let _ = task_event_tx.send(event);
            }
            let _ = task_event_tx.send(ChatStreamEventDto::Done);
            let _ = completion_tx.send(Ok(()));
        });

        ConversationStreamHandle {
            event_tx,
            completion: completion_rx,
        }
    }

    async fn resolve_images(&self, file_ids: &[Uuid]) -> anyhow::Result<Vec<Base64Image>> {
        if file_ids.is_empty() {
            return Ok(Vec::new());
        }
        FileService::new(&self.providers)
            .fetch_images_for_ai(self.user_id, file_ids)
            .await
    }
}

impl ConversationProvider for UserConversationProvider {
    async fn load_history(&self) -> anyhow::Result<Vec<HistoryEntry>> {
        let messages = self
            .conv_service
            .get_messages(self.conversation_id, self.user_id, None, 1000)
            .await?;
        Ok(messages
            .into_iter()
            .filter_map(|m| {
                let file_ids = m.file_ids.clone();
                serde_json::from_value::<ChatHistoryMessageDto>(m.content)
                    .ok()
                    .map(|dto| HistoryEntry {
                        message: ChatHistoryMessage::from(dto),
                        file_ids,
                    })
            })
            .collect())
    }

    async fn fetch_images(&self, file_ids: &[Uuid]) -> anyhow::Result<Vec<Base64Image>> {
        self.resolve_images(file_ids).await
    }

    async fn record_user_message(&self, content: String, file_ids: &[Uuid]) -> anyhow::Result<()> {
        self.conv_service
            .insert_message(
                self.conversation_id,
                ChatHistoryMessageDto::User { content },
                file_ids,
            )
            .await?;
        Ok(())
    }

    async fn append_message(&self, message: ChatHistoryMessage) -> anyhow::Result<()> {
        self.conv_service
            .insert_message(
                self.conversation_id,
                ChatHistoryMessageDto::from(message),
                &[],
            )
            .await?;
        Ok(())
    }
}

pub struct ConversationStreamHandle {
    event_tx: broadcast::Sender<ChatStreamEventDto>,
    completion: oneshot::Receiver<anyhow::Result<()>>,
}

impl ConversationStreamHandle {
    pub fn subscribe(&self) -> broadcast::Receiver<ChatStreamEventDto> {
        self.event_tx.subscribe()
    }

    pub async fn await_completion(self) -> anyhow::Result<()> {
        match self.completion.await {
            Ok(result) => result,
            Err(_) => Err(anyhow::anyhow!(
                "conversation provider task aborted before completion"
            )),
        }
    }
}

pub fn subscription_stream(
    mut rx: broadcast::Receiver<ChatStreamEventDto>,
) -> impl Stream<Item = ChatStreamEventDto> {
    async_stream::stream! {
        loop {
            match rx.recv().await {
                Ok(event) => {
                    let is_done = matches!(event, ChatStreamEventDto::Done);
                    yield event;
                    if is_done { break; }
                }
                Err(broadcast::error::RecvError::Closed) => break,
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
            }
        }
    }
}
