import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { AccountIdentifier } from "@/types/account";

type Kind = AccountIdentifier["kind"];

const KIND_LABELS: Record<Kind, string> = {
  card_last4: "Card ending",
  account_number: "Account number",
  iban: "IBAN",
};

function normalize(kind: Kind, raw: string): string {
  if (kind === "card_last4") return raw.replace(/\D/g, "").slice(0, 4);
  if (kind === "account_number") return raw.replace(/\D/g, "");
  return raw.replace(/\s/g, "").toUpperCase();
}

function validate(kind: Kind, v: string): string | null {
  if (kind === "card_last4")
    return /^\d{4}$/.test(v) ? null : "Card ending must be 4 digits.";
  if (kind === "account_number")
    return /^\d{4,34}$/.test(v) ? null : "Account number must be 4–34 digits.";
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v) ? null : "Enter a valid IBAN.";
}

export function AccountIdentifiersEditor({
  value,
  onChange,
}: {
  value: AccountIdentifier[];
  onChange: (next: AccountIdentifier[]) => void;
}) {
  const [kind, setKind] = useState<Kind>("card_last4");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const v = normalize(kind, draft);
    const err = validate(kind, v);
    if (err) return setError(err);
    if (value.some((i) => i.kind === kind && i.value === v))
      return setError("Already added.");
    onChange([...value, { kind, value: v }]);
    setDraft("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No identifiers yet.
          </span>
        )}
        {value.map((id) => (
          <Badge
            key={`${id.kind}:${id.value}`}
            variant="outline"
            className="gap-1 pr-1"
          >
            <span className="text-muted-foreground">
              {KIND_LABELS[id.kind]}:
            </span>{" "}
            {id.kind === "iban" && id.value.length > 12
              ? `${id.value.slice(0, 4)}…${id.value.slice(-4)}`
              : id.value}
            <button
              type="button"
              aria-label={`Remove ${KIND_LABELS[id.kind]} ${id.value}`}
              onClick={() =>
                onChange(
                  value.filter(
                    (x) => !(x.kind === id.kind && x.value === id.value),
                  ),
                )
              }
              className="ml-1 rounded-full p-0.5 hover:bg-muted"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={kind}
          onValueChange={(k) => {
            setKind(k as Kind);
            setDraft("");
            setError(null);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="card_last4">Card ending</SelectItem>
            <SelectItem value="account_number">Account number</SelectItem>
            <SelectItem value="iban">IBAN</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={kind === "iban" ? "GB29 NWBK…" : "1234"}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
