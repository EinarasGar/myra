import { useEffect } from "react"

import { getErrorMessage } from "@/lib/errors"
import { subscribeToApiErrors } from "@/lib/query"
import { toast } from "@/components/ui/toast"

import { retryAfterCopy } from "./error-copy"

export function ApiErrorToaster() {
  useEffect(
    () =>
      subscribeToApiErrors(({ error, source, context }) => {
        if (source !== "mutation") return
        toast.add({
          type: "error",
          timeout: 0,
          priority: "high",
          title: context ?? "That didn't save",
          description: [getErrorMessage(error), retryAfterCopy(error)]
            .filter(Boolean)
            .join(" "),
        })
      }),
    []
  )

  return null
}
