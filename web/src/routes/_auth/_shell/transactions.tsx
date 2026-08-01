import { useCallback, useRef } from "react"
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { ChevronDown, Layers, Plus, Receipt } from "lucide-react"
import { z } from "zod"

import { useUserId } from "@/auth"
import {
  RouteErrorPanel,
  RoutePending,
} from "@/components/layout/route-boundaries"
import { PageHeader } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NEW_TRANSACTION,
  useTransactionEditor,
} from "@/features/transactions/editor"
import type {
  ExplorePatchSearch,
  ExploreSearchHistory,
  ExploreSearchPatch,
} from "@/features/transactions/explore"
import { ExploreScreen, GROUP_BY_MODES } from "@/features/transactions/explore"
import { GroupComposer, useGrouping } from "@/features/transactions/grouping"
import { ModeSwitch, ReviewScreen } from "@/features/transactions/review"
import { accountsQueryOptions } from "@/features/accounts/api"
import { categoriesQueryOptions } from "@/features/categories/api"
import {
  combinedLedgerInfiniteQueryOptions,
  LEDGER_PAGE_SIZE,
} from "@/features/transactions/api"
import { warm } from "@/lib/query"

import { optionalText } from "../../-search"
import { warmScope } from "../../-warm"

const transactionsSearchSchema = z.object({
  mode: z.enum(["explore", "review"]).default("explore").catch("explore"),
  account: optionalText,
  q: optionalText,
  category: z.coerce.number().int().optional().catch(undefined),
  type: optionalText,
  from: optionalText,
  to: optionalText,
  group: z.enum(GROUP_BY_MODES).optional().catch(undefined),
  upload: z.enum(["receipt"]).optional().catch(undefined),
  tx: optionalText,
  expand: optionalText,
})

export type TransactionsSearch = z.infer<typeof transactionsSearchSchema>

const SCOPE_KEYS = [
  "q",
  "account",
  "category",
  "type",
  "from",
  "to",
  "group",
] as const satisfies readonly (keyof ExploreSearchPatch)[]

type TransactionsPatch = ExploreSearchPatch & {
  readonly upload?: "receipt" | undefined
}

/** Only a change of what the ledger is showing earns a jump back to the top. */
function changesScope(patch: TransactionsPatch): boolean {
  return SCOPE_KEYS.some((key) => key in patch)
}

export function TransactionsPage({
  search,
  onPatch,
  onUploadOpenChange,
}: {
  search: TransactionsSearch
  onPatch: ExplorePatchSearch
  onUploadOpenChange?: (open: boolean) => void
}) {
  const userId = useUserId()
  const editor = useTransactionEditor()
  const grouping = useGrouping(userId)

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title={search.mode === "review" ? "Review" : "Transactions"}
        actions={
          <div className="flex items-center gap-2">
            <ModeSwitch mode={search.mode} />
            <div className="flex items-center">
              <Button
                size="lg"
                onClick={() => {
                  editor.openCreate()
                }}
                className="rounded-r-none"
              >
                <Plus data-icon="inline-start" aria-hidden />
                {NEW_TRANSACTION}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="lg"
                      aria-label="More ways to add"
                      className="rounded-l-none border-l border-l-scrim px-2"
                    />
                  }
                >
                  <ChevronDown aria-hidden className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      editor.openCreate()
                    }}
                  >
                    <Receipt aria-hidden className="size-4" />
                    Transaction
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      grouping.composer.openCreate()
                    }}
                  >
                    <Layers aria-hidden className="size-4" />
                    Group of transactions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        }
      />
      {search.mode === "review" ? (
        <ReviewScreen
          editor={editor}
          uploadOpen={search.upload === "receipt"}
          {...(onUploadOpenChange === undefined ? {} : { onUploadOpenChange })}
        />
      ) : (
        <ExploreScreen
          search={search}
          onPatch={onPatch}
          editor={editor}
          grouping={grouping}
        />
      )}

      <GroupComposer
        userId={userId}
        controller={grouping.composer}
        actions={grouping.actions}
      />
    </>
  )
}

function TransactionsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const pushedSurface = useRef(false)

  const patchSearch = useCallback(
    (patch: TransactionsPatch, history: ExploreSearchHistory = "replace") => {
      const scope = changesScope(patch)
      if (history === "back" && pushedSurface.current && !scope) {
        pushedSurface.current = false
        router.history.back()
        return
      }
      pushedSurface.current = history === "push" && !scope
      void navigate({
        to: "/transactions",
        search: (previous) => ({ ...previous, ...patch }),
        replace: history !== "push",
        resetScroll: scope,
      })
    },
    [navigate, router]
  )

  const setUploadOpen = useCallback(
    (open: boolean) => {
      patchSearch(
        { upload: open ? ("receipt" as const) : undefined },
        open ? "push" : "back"
      )
    },
    [patchSearch]
  )

  return (
    <TransactionsPage
      search={search}
      onPatch={patchSearch}
      onUploadOpenChange={setUploadOpen}
    />
  )
}

export const Route = createFileRoute("/_auth/_shell/transactions")({
  validateSearch: transactionsSearchSchema,
  /**
   * Warms the unfiltered ledger only. Reading the filters here would re-run the
   * loader on every keystroke in the search box, for a page the user is about to
   * replace anyway.
   */
  loader: async ({ context }) => {
    const scope = await warmScope(context)
    if (scope === null) return
    const { queryClient, userId } = scope
    warm([
      queryClient.ensureInfiniteQueryData(
        combinedLedgerInfiniteQueryOptions({
          userId,
          query: undefined,
          limit: LEDGER_PAGE_SIZE,
        })
      ),
      queryClient.ensureQueryData(categoriesQueryOptions(userId)),
      queryClient.ensureQueryData(accountsQueryOptions(userId)),
    ])
  },
  component: TransactionsRoute,
  errorComponent: RouteErrorPanel,
  pendingComponent: RoutePending,
})
