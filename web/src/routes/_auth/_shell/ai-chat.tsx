import { useCallback } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import {
  RouteErrorPanel,
  RoutePending,
} from "@/components/layout/route-boundaries"
import { MyraScreen } from "@/features/myra"

const myraSearchSchema = z.object({
  ask: z.string().optional(),
  context: z.string().optional(),
})

function MyraRoute() {
  const { ask, context } = Route.useSearch()
  const navigate = useNavigate()

  const clearAsk = useCallback(() => {
    void navigate({ to: "/ai-chat", search: {}, replace: true })
  }, [navigate])

  return <MyraScreen ask={ask} contextPage={context} onAskConsumed={clearAsk} />
}

export const Route = createFileRoute("/_auth/_shell/ai-chat")({
  validateSearch: myraSearchSchema,
  component: MyraRoute,
  errorComponent: RouteErrorPanel,
  pendingComponent: RoutePending,
})
