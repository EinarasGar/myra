export type ChatRole = "user" | "assistant"

export type ToolPhase = "running" | "done" | "failed"

export interface TextPart {
  readonly kind: "text"
  readonly text: string
}

export interface ReasoningPart {
  readonly kind: "reasoning"
  readonly text: string
}

export interface ToolPart {
  readonly kind: "tool"
  readonly callId: string
  readonly name: string
  readonly input: unknown
  readonly output: string | null
  readonly phase: ToolPhase
  readonly at: number
}

export type ProposalDecision = "pending" | "approved" | "denied"

export interface ProposalPart {
  readonly kind: "proposal"
  readonly toolCallId: string
  readonly name: string
  readonly args: unknown
  readonly decision: ProposalDecision
}

export interface ErrorPart {
  readonly kind: "error"
  readonly message: string
  readonly resetAt: string | null
  readonly retryable: boolean
}

export type ChatPart =
  TextPart | ReasoningPart | ToolPart | ProposalPart | ErrorPart

export interface ChatTurn {
  readonly id: string
  readonly role: ChatRole
  readonly parts: readonly ChatPart[]
  readonly at: number
  readonly askedFrom: string | null
}
