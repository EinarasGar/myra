use futures_util::StreamExt;

#[derive(Debug, Clone)]
pub enum SseEvent {
    State { step: String },
    Proposal,
    Error { message: String },
    Done,
}

pub async fn subscribe_sse(
    http: &reqwest::Client,
    base_url: &str,
    user_id: &str,
    upload_id: &str,
    auth_token: Option<&str>,
) -> tokio::sync::mpsc::Receiver<SseEvent> {
    let (tx, rx) = tokio::sync::mpsc::channel(32);

    let url = format!(
        "{}/api/users/{}/ai/quick-upload/{}/subscribe",
        base_url, user_id, upload_id
    );

    let mut builder = http
        .get(&url)
        .header("Accept", "text/event-stream");
    if let Some(token) = auth_token {
        builder = builder.bearer_auth(token);
    }

    let response = match builder.send().await {
        Ok(resp) => resp,
        Err(e) => {
            let tx_err = tx.clone();
            tokio::spawn(async move {
                let _ = tx_err
                    .send(SseEvent::Error {
                        message: format!("SSE connection failed: {e}"),
                    })
                    .await;
            });
            return rx;
        }
    };

    tokio::spawn(async move {
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk) = stream.next().await {
            let bytes = match chunk {
                Ok(b) => b,
                Err(e) => {
                    let _ = tx
                        .send(SseEvent::Error {
                            message: format!("Stream error: {e}"),
                        })
                        .await;
                    break;
                }
            };

            let text = match std::str::from_utf8(&bytes) {
                Ok(t) => t,
                Err(_) => continue,
            };

            buffer.push_str(text);

            // Process complete events (terminated by double newline)
            while let Some(pos) = buffer.find("\n\n") {
                let event_block = buffer[..pos].to_string();
                buffer = buffer[pos + 2..].to_string();

                let (event_type, data) = parse_sse_block(&event_block);

                let sse_event = match event_type.as_str() {
                    "state" => {
                        let step = serde_json::from_str::<serde_json::Value>(&data)
                            .ok()
                            .and_then(|v| v["step"].as_str().map(|s| s.to_string()))
                            .unwrap_or(data);
                        SseEvent::State { step }
                    }
                    "proposal" => SseEvent::Proposal,
                    "error" => {
                        let message = serde_json::from_str::<serde_json::Value>(&data)
                            .ok()
                            .and_then(|v| v["message"].as_str().map(|s| s.to_string()))
                            .unwrap_or(data);
                        SseEvent::Error { message }
                    }
                    "done" => SseEvent::Done,
                    _ => continue,
                };

                let is_terminal = matches!(
                    sse_event,
                    SseEvent::Proposal | SseEvent::Error { .. } | SseEvent::Done
                );
                let _ = tx.send(sse_event).await;
                if is_terminal {
                    return;
                }
            }
        }
    });

    rx
}

fn parse_sse_block(block: &str) -> (String, String) {
    let mut event_type = String::from("message");
    let mut data_lines: Vec<&str> = Vec::new();

    for line in block.lines() {
        if let Some(value) = line.strip_prefix("event:") {
            event_type = value.trim().to_string();
        } else if let Some(value) = line.strip_prefix("data:") {
            data_lines.push(value.trim_start_matches(' '));
        }
    }

    (event_type, data_lines.join("\n"))
}
