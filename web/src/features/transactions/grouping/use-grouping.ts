import type { UserId } from "@/lib/query"

import type { GroupActions } from "./use-group-actions"
import { useGroupActions } from "./use-group-actions"
import type { GroupComposerController } from "./use-group-composer"
import { useGroupComposer } from "./use-group-composer"

export interface GroupingSurface {
  readonly composer: GroupComposerController
  readonly actions: GroupActions
}

export function useGrouping(userId: UserId): GroupingSurface {
  return {
    composer: useGroupComposer(),
    actions: useGroupActions(userId),
  }
}
