import { useEffect, useRef, useState } from "react"
import type { QueryClient } from "@tanstack/react-query"
import { RouterProvider, type AnyRouter } from "@tanstack/react-router"

import { useAuth } from "@/auth"
import { FigureBaseCurrencyProvider } from "@/components/figure"

import { AppBootSkeleton } from "./boot-skeleton"

export function AppRouterProvider<TRouter extends AnyRouter>({
  router,
  queryClient,
}: {
  router: TRouter
  queryClient: QueryClient
}) {
  const auth = useAuth()
  const identity = `${String(auth.isAuthenticated)}:${auth.userId ?? ""}`
  const lastIdentity = useRef(identity)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    if (lastIdentity.current === identity) return
    lastIdentity.current = identity
    void router.invalidate()
  }, [identity, router])

  if (auth.isReady && !booted) {
    setBooted(true)
  }

  if (!booted) return <AppBootSkeleton />

  return (
    <FigureBaseCurrencyProvider currency={auth.baseCurrency}>
      <RouterProvider router={router} context={{ auth, queryClient }} />
    </FigureBaseCurrencyProvider>
  )
}
