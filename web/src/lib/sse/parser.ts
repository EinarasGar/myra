export interface SseMessage {
  event: string
  data: string
  id?: string
  retry?: number
}

export async function readSseStream(
  stream: ReadableStream<Uint8Array>,
  onMessage: (message: SseMessage) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  let buffer = ""
  let eventName = ""
  let dataLines: string[] = []
  let lastId: string | undefined
  let retry: number | undefined

  const dispatch = () => {
    // The server ends both streams with `event: done` and an empty data payload, which the
    // SSE spec would drop, so an event name alone is enough to dispatch here.
    if (dataLines.length === 0 && eventName === "") return
    onMessage({
      event: eventName === "" ? "message" : eventName,
      data: dataLines.join("\n"),
      ...(lastId === undefined ? {} : { id: lastId }),
      ...(retry === undefined ? {} : { retry }),
    })
    eventName = ""
    dataLines = []
    retry = undefined
  }

  const consumeLine = (line: string) => {
    if (line === "") {
      dispatch()
      return
    }
    if (line.startsWith(":")) return

    const separatorIndex = line.indexOf(":")
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    const rawValue = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1)
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue

    switch (field) {
      case "event":
        eventName = value
        break
      case "data":
        dataLines.push(value)
        break
      case "id":
        if (!value.includes("\0")) lastId = value
        break
      case "retry": {
        const parsed = Number.parseInt(value, 10)
        if (Number.isFinite(parsed)) retry = parsed
        break
      }
    }
  }

  const consumeChunk = (chunk: string) => {
    buffer += chunk
    let newlineIndex = buffer.indexOf("\n")
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "")
      buffer = buffer.slice(newlineIndex + 1)
      consumeLine(line)
      newlineIndex = buffer.indexOf("\n")
    }
  }

  try {
    for (;;) {
      if (signal?.aborted) return
      const { value, done } = await reader.read()
      if (done) break
      if (value !== undefined)
        consumeChunk(decoder.decode(value, { stream: true }))
    }
    consumeChunk(decoder.decode())
    if (buffer !== "") consumeLine(buffer.replace(/\r$/, ""))
    dispatch()
  } finally {
    reader.releaseLock()
  }
}
