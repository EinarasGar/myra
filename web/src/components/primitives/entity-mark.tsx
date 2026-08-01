import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

import type { EntityMarkSize } from "./entity-mark-identity"
import {
  ENTITY_MARK_ROOT_SIZE,
  ENTITY_MARK_TEXT_SIZE,
  entityMarkSlot,
  entityMonogram,
  TILE_PALETTE,
} from "./entity-mark-identity"

export interface EntityMarkProps {
  seed: string
  label: string
  size?: EntityMarkSize
  className?: string
}

export function EntityMark({
  seed,
  label,
  size = "sm",
  className,
}: EntityMarkProps) {
  const slot = entityMarkSlot(seed)

  return (
    <Avatar
      data-slot="entity-mark"
      aria-hidden
      className={cn(
        "flex-none after:hidden",
        ENTITY_MARK_ROOT_SIZE[size],
        className
      )}
    >
      <AvatarFallback
        className={cn(
          "font-semibold tracking-[0.01em] tabular-nums",
          ENTITY_MARK_ROOT_SIZE[size],
          ENTITY_MARK_TEXT_SIZE[size],
          TILE_PALETTE[slot]
        )}
      >
        {entityMonogram(label)}
      </AvatarFallback>
    </Avatar>
  )
}

export function EntityMarkGroup({
  entities,
  size = "sm",
  limit = 2,
  className,
}: {
  entities: readonly EntityMarkProps[]
  size?: EntityMarkSize
  limit?: number
  className?: string
}) {
  const shown = entities.slice(0, limit)
  const only = shown[0]
  if (only === undefined) return null
  if (shown.length === 1) {
    return (
      <EntityMark
        seed={only.seed}
        label={only.label}
        size={size}
        className={className}
      />
    )
  }

  return (
    <AvatarGroup
      className={cn(
        "flex-none -space-x-[3px] *:data-[slot=entity-mark]:ring-1 *:data-[slot=entity-mark]:ring-surface",
        className
      )}
    >
      {shown.map((entity) => (
        <EntityMark
          key={entity.seed}
          seed={entity.seed}
          label={entity.label}
          size={size}
        />
      ))}
    </AvatarGroup>
  )
}
