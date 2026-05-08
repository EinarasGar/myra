export interface SseEvent {
  event: string;
  data: string;
}

export async function readSseStream(
  response: Response,
  onEvent: (e: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";
  let dataLines: string[] = [];

  const flush = () => {
    if (dataLines.length === 0 && !currentEvent) return;
    onEvent({ event: currentEvent || "message", data: dataLines.join("\n") });
    currentEvent = "";
    dataLines = [];
  };

  while (true) {
    if (signal?.aborted) {
      reader.cancel().catch(() => {});
      return;
    }
    const { value, done } = await reader.read();
    if (done) {
      flush();
      return;
    }
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).replace(/\r$/, "");
      buffer = buffer.slice(newlineIdx + 1);

      if (line === "") {
        flush();
      } else if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).replace(/^ /, ""));
      } else if (line.startsWith(":")) {
        // comment / keep-alive — ignore
      }
    }
  }
}
