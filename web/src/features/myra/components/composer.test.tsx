import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const uploadFile = vi.fn()
const discardUploadedFile = vi.fn()

vi.mock("@/features/uploads/api/upload-file", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/features/uploads/api/upload-file")
  >()),
  uploadFile: (init: unknown) => uploadFile(init) as unknown,
  discardUploadedFile: (userId: string, fileId: string) =>
    discardUploadedFile(userId, fileId) as unknown,
}))

const { Composer } = await import("./composer")

const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

function pngFile(name = "receipt.png"): File {
  const file = new File(["receipt"], name, { type: "image/png" })
  Object.defineProperty(file, "size", { value: 4096 })
  return file
}

function renderComposer(onSend = vi.fn(), draft = "") {
  render(
    <Composer
      userId={TEST_USER_ID}
      streaming={false}
      draft={draft}
      onDraftChange={() => {}}
      onSend={onSend}
      onStop={() => {}}
    />
  )
  return onSend
}

beforeEach(() => {
  uploadFile.mockReset()
  discardUploadedFile.mockReset()
})

describe("Composer attachments", () => {
  it("offers an attach affordance next to the message box", () => {
    renderComposer()
    expect(
      screen.getByRole("button", { name: "Attach a file" })
    ).toBeInTheDocument()
  })

  it("uploads an attached file and sends its id with the message", async () => {
    uploadFile.mockResolvedValue("file-77")
    const onSend = renderComposer(vi.fn(), "what is this?")

    const input = screen.getByLabelText<HTMLInputElement>(
      "Choose files to attach"
    )
    await userEvent.upload(input, pngFile())

    await waitFor(() => {
      expect(screen.getByText("receipt.png")).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole("button", { name: /Send/ }))

    expect(onSend).toHaveBeenCalledWith("what is this?", [
      { fileId: "file-77", name: "receipt.png" },
    ])
  })

  it("blocks send while a file is still uploading and says why", async () => {
    uploadFile.mockImplementation(() => new Promise(() => {}))
    renderComposer(vi.fn(), "hello")

    const input = screen.getByLabelText<HTMLInputElement>(
      "Choose files to attach"
    )
    await userEvent.upload(input, pngFile())

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Send/ })).toBeDisabled()
    })
    expect(screen.getByText(/Files are still uploading/)).toBeInTheDocument()
  })

  it("lets an attachment alone be sent with no typed message", async () => {
    uploadFile.mockResolvedValue("file-78")
    const onSend = renderComposer()

    const input = screen.getByLabelText<HTMLInputElement>(
      "Choose files to attach"
    )
    await userEvent.upload(input, pngFile("lunch.png"))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Send/ })).toBeEnabled()
    })
    await userEvent.click(screen.getByRole("button", { name: /Send/ }))
    expect(onSend).toHaveBeenCalledWith("", [
      { fileId: "file-78", name: "lunch.png" },
    ])
  })

  it("deletes the stored file when an attachment is removed before sending", async () => {
    uploadFile.mockResolvedValue("file-80")
    renderComposer()

    const input = screen.getByLabelText<HTMLInputElement>(
      "Choose files to attach"
    )
    await userEvent.upload(input, pngFile("stray.png"))
    await waitFor(() => {
      expect(screen.getByText("Uploaded · 4 KB")).toBeInTheDocument()
    })

    await userEvent.click(
      screen.getByRole("button", { name: "Remove stray.png" })
    )
    expect(discardUploadedFile).toHaveBeenCalledWith(TEST_USER_ID, "file-80")
    expect(screen.queryByText("stray.png")).not.toBeInTheDocument()
  })

  it("takes a pasted image without a trip to the file picker", async () => {
    uploadFile.mockResolvedValue("file-79")
    renderComposer()

    const textarea = screen.getByRole("textbox")
    fireEvent.paste(textarea, {
      clipboardData: { files: [pngFile("pasted.png")] },
    })

    await waitFor(() => {
      expect(screen.getByText("pasted.png")).toBeInTheDocument()
    })
    expect(uploadFile).toHaveBeenCalled()
  })

  it("keeps a rejected file out of the message", async () => {
    renderComposer()

    const textarea = screen.getByRole("textbox")
    fireEvent.paste(textarea, {
      clipboardData: {
        files: [new File(["a"], "notes.txt", { type: "text/plain" })],
      },
    })

    expect(await screen.findByText(/Sverto reads/)).toBeInTheDocument()
    expect(uploadFile).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /Send/ })).toBeDisabled()
  })
})
