import { ChevronDown, Sparkle } from "lucide-react"

import { cn } from "@/lib/utils"
import { CopyButton, Response } from "@/components/ai-elements"
import { focusRing, PULSE_CLASS } from "@/components/primitives"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"

import {
  answerCardsFor,
  layoutTurn,
  type AnswerCard,
  type ChatTurn,
  type ProposalPart,
  type TurnBlock,
} from "../api"
import { ASKED_FROM, COPY_ANSWER, REASONING_LABEL } from "../copy"
import { AnswerCardView } from "./answer-card"
import { ApprovalCard, ProposalReceipt } from "./approval-card"
import { StreamErrorNote } from "./banners"
import { WorkLine } from "./work-line"

export interface TurnViewProps {
  turn: ChatTurn
  userId: string
  streaming: boolean
  busy: boolean
  pinnedIds: readonly string[]
  onPin: (card: AnswerCard) => void
  onRefine: (prompt: string) => void
  onRespond: (toolCallIds: readonly string[], approved: boolean) => void
  onRetry: () => void
}

function UserTurn({ turn }: { turn: ChatTurn }) {
  const text = turn.parts
    .map((part) => (part.kind === "text" ? part.text : ""))
    .join("")

  return (
    <Message align="end" data-slot="myra-user-turn">
      <MessageContent>
        {turn.askedFrom === null ? null : (
          <span className="self-end text-[10.5px] leading-none text-ink-3">
            {ASKED_FROM(turn.askedFrom)}
          </span>
        )}
        <Bubble align="end" variant="outline">
          <BubbleContent className="max-w-[84%] rounded-[11px] rounded-br-[4px] border-border bg-surface-2 px-[13px] py-[10px] text-[12.5px] leading-[1.55] text-pretty text-ink sm:max-w-[70%] sm:px-[14px] sm:py-[11px] sm:text-[13px] sm:leading-[1.6]">
            {text}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

function BlockView({
  block,
  props,
  pendingProposalGroup,
}: {
  block: TurnBlock
  props: TurnViewProps
  pendingProposalGroup: readonly ProposalPart[]
}) {
  switch (block.kind) {
    case "reasoning":
      return (
        <details className="group">
          <summary
            className={cn(
              "flex w-fit list-none items-center gap-1 text-[11px] leading-none text-ink-3 hover:text-ink-2",
              focusRing.chip
            )}
          >
            {REASONING_LABEL}
            <ChevronDown
              aria-hidden
              strokeWidth={2}
              className="size-[11px] transition-transform duration-quick ease-out-quick group-open:rotate-180"
            />
          </summary>
          <Response
            streaming={props.streaming}
            className="mt-2 [&_li]:text-[12px] [&_li]:text-ink-3 [&_p]:text-[12px] [&_p]:text-ink-3"
          >
            {block.text}
          </Response>
        </details>
      )
    case "text":
      return <Response streaming={props.streaming}>{block.text}</Response>
    case "work": {
      const cards = answerCardsFor(block.steps)
      return (
        <div className="flex min-w-0 flex-col gap-4">
          <WorkLine steps={block.steps} />
          {cards.map((card) => (
            <AnswerCardView
              key={card.id}
              card={card}
              pinned={props.pinnedIds.includes(card.id)}
              onPin={() => {
                props.onPin(card)
              }}
              onRefine={props.onRefine}
            />
          ))}
        </div>
      )
    }
    case "proposal":
      if (block.proposal.decision !== "pending") {
        return <ProposalReceipt proposal={block.proposal} />
      }
      if (block.proposal.toolCallId !== pendingProposalGroup[0]?.toolCallId) {
        return null
      }
      return (
        <ApprovalCard
          proposals={pendingProposalGroup}
          userId={props.userId}
          busy={props.busy}
          onRespond={props.onRespond}
        />
      )
    case "error":
      return <StreamErrorNote error={block.error} onRetry={props.onRetry} />
  }
}

export function TurnView(props: TurnViewProps) {
  const { turn } = props
  if (turn.role === "user") return <UserTurn turn={turn} />

  const blocks = layoutTurn(turn.parts)
  const pending = turn.parts.filter(
    (part): part is ProposalPart =>
      part.kind === "proposal" && part.decision === "pending"
  )
  const awaitingFirstToken = props.streaming && blocks.length === 0
  const answerText = blocks
    .filter((block) => block.kind === "text")
    .map((block) => block.text)
    .join("\n\n")

  return (
    <Message align="start" data-slot="myra-assistant-turn">
      <span
        aria-hidden
        className={cn(
          "mt-[3px] flex-none",
          props.streaming && !awaitingFirstToken && PULSE_CLASS
        )}
      >
        <Sparkle className="size-[15px] text-brand" strokeWidth={1.8} />
      </span>
      <MessageContent className="gap-4">
        {awaitingFirstToken ? (
          <span
            className={cn("text-[12px] leading-none text-ink-3", PULSE_CLASS)}
          >
            Myra is reading your ledger…
          </span>
        ) : null}
        {blocks.map((block) => (
          <BlockView
            key={block.id}
            block={block}
            props={props}
            pendingProposalGroup={pending}
          />
        ))}
        {answerText === "" || props.streaming ? null : (
          <div data-slot="myra-turn-actions" className="-mt-1 flex">
            <CopyButton
              value={answerText}
              label={COPY_ANSWER}
              withText
              className="-ml-2"
            />
          </div>
        )}
      </MessageContent>
    </Message>
  )
}
