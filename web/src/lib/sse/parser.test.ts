import { describe, expect, it, vi } from "vitest"

import type { SseMessage } from "./parser"
import { readSseStream } from "./parser"

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

async function collect(chunks: string[]): Promise<SseMessage[]> {
  const messages: SseMessage[] = []
  await readSseStream(streamOf(chunks), (message) => messages.push(message))
  return messages
}

describe("readSseStream", () => {
  it("parses the chat stream shape", async () => {
    const messages = await collect([
      "event: text\ndata: Hello\n\n",
      'event: tool_call\ndata: {"call_id":"c1","name":"search","input":{"q":"tesco"}}\n\n',
      "event: done\ndata: \n\n",
    ])

    expect(messages).toEqual([
      { event: "text", data: "Hello" },
      {
        event: "tool_call",
        data: '{"call_id":"c1","name":"search","input":{"q":"tesco"}}',
      },
      { event: "done", data: "" },
    ])
  })

  it("reassembles events split across chunk boundaries", async () => {
    const messages = await collect([
      "event: te",
      "xt\ndata: Hel",
      "lo there\n",
      "\n",
    ])

    expect(messages).toEqual([{ event: "text", data: "Hello there" }])
  })

  it("handles CRLF line endings", async () => {
    const messages = await collect(["event: text\r\ndata: Hello\r\n\r\n"])

    expect(messages).toEqual([{ event: "text", data: "Hello" }])
  })

  it("joins multi-line data payloads with a newline", async () => {
    const messages = await collect([
      "event: text\ndata: line one\ndata: line two\n\n",
    ])

    expect(messages[0]?.data).toBe("line one\nline two")
  })

  it("ignores keep-alive comments", async () => {
    const messages = await collect([
      ":\n\n",
      ": keep-alive\n\n",
      "event: done\ndata: \n\n",
    ])

    expect(messages).toEqual([{ event: "done", data: "" }])
  })

  it("keeps a data payload that contains colons intact", async () => {
    const messages = await collect([
      'event: error\ndata: {"kind":"provider_unavailable","message":"Down: retry"}\n\n',
    ])

    expect(messages[0]?.data).toBe(
      '{"kind":"provider_unavailable","message":"Down: retry"}'
    )
  })

  it("carries id and retry fields", async () => {
    const messages = await collect([
      "id: 42\nretry: 3000\nevent: text\ndata: hi\n\n",
    ])

    expect(messages[0]).toMatchObject({ id: "42", retry: 3000 })
  })

  it("flushes a trailing event that never got its blank line", async () => {
    const messages = await collect(["event: text\ndata: partial\n"])

    expect(messages).toEqual([{ event: "text", data: "partial" }])
  })

  it("stops reading once the signal aborts", async () => {
    const controller = new AbortController()
    const onMessage = vi.fn(() => controller.abort())

    await readSseStream(
      streamOf(["event: text\ndata: one\n\n", "event: text\ndata: two\n\n"]),
      onMessage,
      controller.signal
    )

    expect(onMessage).toHaveBeenCalledTimes(1)
  })
})
