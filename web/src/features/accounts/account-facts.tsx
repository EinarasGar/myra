import { useState, type ReactNode } from "react"

import type { AccountIdentifier, AccountIdentifierKind } from "@/api"
import { Figure } from "@/components/figure"
import {
  focusRing,
  Panel,
  PanelFootnote,
  PanelHeader,
  PanelTitle,
  Truncate,
} from "@/components/primitives"
import { mockAccountMetadata, MockBadge, mockAttributes } from "@/lib/mock"
import { cn } from "@/lib/utils"

import type { AccountDetail } from "./api"
import { maskIdentifier } from "./presentation"

const METADATA_MOCK = "accounts.financial-metadata"

const IDENTIFIER_LABELS: Record<AccountIdentifierKind, string> = {
  card_last4: "Card",
  account_number: "Account number",
  iban: "IBAN",
}

function Row({
  label,
  value,
  children,
  action,
  mocked = false,
}: {
  label: string
  value?: string
  children: ReactNode
  action?: ReactNode
  mocked?: boolean
}) {
  return (
    <div
      className="flex items-center gap-4 border-b border-border px-[18px] py-[13px] last:border-b-0"
      {...(mocked ? mockAttributes(METADATA_MOCK) : {})}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[6px] text-[9.5px] leading-none font-semibold tracking-[0.1em] text-ink-3 uppercase">
          {label}
          {mocked ? <MockBadge id={METADATA_MOCK} /> : null}
        </div>
        <div className="mt-[7px] font-mono text-[12.5px] leading-none text-ink">
          {value === undefined ? (
            <span className="block truncate">{children}</span>
          ) : (
            <Truncate text={value} className="block">
              {children}
            </Truncate>
          )}
        </div>
      </div>
      {action === undefined ? null : <div className="flex-none">{action}</div>}
    </div>
  )
}

function IdentifierRow({ identifier }: { identifier: AccountIdentifier }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <Row
      label={IDENTIFIER_LABELS[identifier.kind]}
      value={revealed ? identifier.value : maskIdentifier(identifier)}
      action={
        <button
          type="button"
          onClick={() => {
            setRevealed((previous) => !previous)
          }}
          className={cn(
            "text-[11.5px] leading-none font-semibold text-brand outline-none",
            focusRing.chip
          )}
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
      }
    >
      {revealed ? identifier.value : maskIdentifier(identifier)}
    </Row>
  )
}

export function AccountFacts({ account }: { account: AccountDetail }) {
  const metadata = mockAccountMetadata(account.name)

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Account</PanelTitle>
      </PanelHeader>
      <Row label="Type">
        {account.accountTypeName}
        <span className="text-ink-3">
          {" · "}
          {account.isLiability ? "liability" : "asset"}
          {" · "}
          {account.isLiquid ? "liquid" : "illiquid"}
        </span>
      </Row>
      <Row label="Ownership share">
        <Figure
          value={account.ownershipSharePercent}
          kind="percent"
          scale="percent"
          size="base"
          className="text-[12.5px]"
        />
        {account.isJoint ? (
          <span className="ms-2 font-sans text-[11px] text-ink-3">
            joint — the rest belongs to someone else
          </span>
        ) : null}
      </Row>
      {metadata?.institution === undefined ? null : (
        <Row label="Institution" value={metadata.institution} mocked>
          {metadata.institution}
        </Row>
      )}
      {metadata?.reference === undefined ? null : (
        <Row label="Reference" value={metadata.reference} mocked>
          {metadata.reference}
        </Row>
      )}
      {account.identifiers.map((identifier) => (
        <IdentifierRow
          key={`${identifier.kind}-${identifier.value}`}
          identifier={identifier}
        />
      ))}
      <PanelFootnote>
        Identifiers are how imported transactions get matched to this account.
        They are stored encrypted and masked until you reveal them.
        {account.isLiability
          ? " A liability holds negative value, so paying it down raises your net worth and the chart climbs toward zero."
          : ""}
      </PanelFootnote>
    </Panel>
  )
}
