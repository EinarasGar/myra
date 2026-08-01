import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import { PageHeader, PageHeaderBackLink } from "@/components/primitives"

import { AccountsSection } from "./accounts-section"
import { CategoriesSection } from "./categories-section"
import { ConnectionDetail } from "./connection-detail"
import { ConnectionsSection } from "./connections-section"
import { GeneralSection } from "./general-section"
import { MyraSection } from "./myra-section"
import type { SettingsSection } from "./nav"
import { SETTINGS_SECTION_META } from "./nav"
import { SettingsSectionRail } from "./section-rail"

const SETTINGS_TITLE =
  "[&_h1]:text-[24px] [&_h1]:leading-[1.2] [&_h1]:tracking-[-0.022em]"

const CONNECTION_INTRO =
  "Read-only access to balances and transactions. Nothing is imported until a provider account is bound to one of yours."

function SectionBody({ section }: { section: SettingsSection }) {
  switch (section) {
    case "general":
      return <GeneralSection />
    case "accounts":
      return <AccountsSection />
    case "categories":
      return <CategoriesSection />
    case "connections":
      return <ConnectionsSection />
    case "myra":
      return <MyraSection />
  }
}

export function SettingsScreen({
  section,
  connectionId,
}: {
  section: SettingsSection
  connectionId?: string | undefined
}) {
  const meta = SETTINGS_SECTION_META[section]
  const onDetail = section === "connections" && connectionId !== undefined

  return (
    <div className="flex min-w-0 flex-col lg:flex-row lg:items-start lg:gap-10">
      <SettingsSectionRail section={section} />
      <div className="min-w-0 flex-1">
        <PageHeader
          className={cn("items-start", SETTINGS_TITLE)}
          eyebrow={onDetail ? "Connection" : meta.title}
          back={
            onDetail ? (
              <PageHeaderBackLink
                render={
                  <Link to="/settings" search={{ section: "connections" }} />
                }
              >
                Connections
              </PageHeaderBackLink>
            ) : undefined
          }
          title={onDetail ? "Manage connection" : meta.title}
          intro={onDetail ? CONNECTION_INTRO : meta.intro}
        />
        {onDetail && connectionId !== undefined ? (
          <ConnectionDetail connectionId={connectionId} />
        ) : (
          <SectionBody section={section} />
        )}
      </div>
    </div>
  )
}
