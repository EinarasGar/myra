import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import {
  RouteErrorPanel,
  RoutePending,
} from "@/components/layout/route-boundaries"
import { SETTINGS_SECTIONS, SettingsScreen } from "@/features/settings"

import { optionalText } from "../../-search"

const settingsSearchSchema = z.object({
  section: z.enum(SETTINGS_SECTIONS).default("general").catch("general"),
  connection: optionalText,
})

function SettingsRoute() {
  const search = Route.useSearch()
  return (
    <SettingsScreen section={search.section} connectionId={search.connection} />
  )
}

export const Route = createFileRoute("/_auth/_shell/settings")({
  validateSearch: settingsSearchSchema,
  component: SettingsRoute,
  errorComponent: RouteErrorPanel,
  pendingComponent: RoutePending,
})
