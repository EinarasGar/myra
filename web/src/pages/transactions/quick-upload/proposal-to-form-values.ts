import type { QuickUploadLookupTables, TransactionInput } from "@/api";
import type { CollectedTransaction } from "../add-transaction-group/add-transaction-group-dialog";
import type { IndividualFormInitialValues } from "../add-individual-transaction/add-transaction-from";
import type { ExpandedAccount } from "@/types/account";
import type { ExpandedAsset } from "@/types/assets";
import type { Category } from "@/types/category";

interface SingleProposal {
  description?: string;
  date?: string;
  account_id?: string;
  asset_id?: number;
  category_id?: number;
  amount?: string;
}

interface GroupProposal {
  description?: string;
  date?: string;
  category_id?: number;
  transactions?: SingleProposal[];
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? undefined : d;
}

function findAccount(
  id: string | undefined,
  lookups: QuickUploadLookupTables,
): ExpandedAccount | null {
  if (!id) return null;
  const a = lookups.accounts.find((x) => x.account_id === id);
  if (!a) return null;
  return { id: a.account_id, name: a.name, ownershipShare: 1 };
}

function findAsset(
  id: number | undefined,
  lookups: QuickUploadLookupTables,
): ExpandedAsset | null {
  if (id === undefined) return null;
  const a = lookups.assets.find((x) => x.asset_id === id);
  if (!a) return null;
  return { id: a.asset_id, ticker: a.ticker, name: a.name, type: null };
}

function findCategory(
  id: number | undefined,
  lookups: QuickUploadLookupTables,
): Category | null {
  if (id === undefined) return null;
  const c = lookups.categories.find((x) => x.id === id);
  if (!c) return null;
  return {
    id: c.id,
    icon: c.icon,
    name: c.category,
    type: { id: c.category_type, name: "" },
  };
}

export function individualProposalToFormValues(
  data: unknown,
  lookups: QuickUploadLookupTables,
): IndividualFormInitialValues {
  const p = (data ?? {}) as SingleProposal;
  return {
    description: p.description,
    date: parseDate(p.date),
    account: findAccount(p.account_id, lookups),
    asset: findAsset(p.asset_id, lookups),
    category: findCategory(p.category_id, lookups),
    amount: p.amount,
  };
}

export function groupProposalToFormValues(
  data: unknown,
  lookups: QuickUploadLookupTables,
): {
  date?: Date;
  description?: string;
  category?: Category | null;
  transactions: CollectedTransaction[];
} {
  const p = (data ?? {}) as GroupProposal;
  const transactions: CollectedTransaction[] = (p.transactions ?? []).map(
    (t) => {
      const input: TransactionInput = {
        type: "regular",
        date: t.date
          ? Math.floor(new Date(`${t.date}T00:00:00`).getTime() / 1000)
          : 0,
        category_id: t.category_id ?? 0,
        description: t.description,
        entry: {
          account_id: t.account_id ?? "",
          asset_id: t.asset_id ?? 0,
          amount: Number(t.amount ?? "0"),
        },
      };
      return {
        id: crypto.randomUUID(),
        input,
        summary: {
          type: "Purchase",
          description: t.description ?? "Item",
        },
      };
    },
  );
  return {
    date: parseDate(p.date),
    description: p.description,
    category: findCategory(p.category_id, lookups),
    transactions,
  };
}
