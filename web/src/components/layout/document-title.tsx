import { useEffect } from "react"
import { useRouterState } from "@tanstack/react-router"

import { titleForPathname } from "./navigation"

export function DocumentTitle() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  useEffect(() => {
    document.title = titleForPathname(pathname)
  }, [pathname])

  return null
}
