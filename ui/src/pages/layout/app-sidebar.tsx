import * as React from "react";
import {
  Briefcase,
  Frame,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/pages/layout/nav-main";
import { NavProjects } from "@/pages/layout/nav-projects";
import { NavUser } from "@/pages/layout/nav-user";
import { ProfileSwitcher } from "@/pages/layout/profile-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { decodeJwt } from "@/lib/jwt";

const navMain = [
  {
    title: "Transactions",
    url: "/transactions",
    icon: SquareTerminal,
    isActive: true,
    items: [
      {
        title: "All Transactions",
        url: "/transactions",
      },
      {
        title: "Individual Transactions",
        url: "/transactions/individual",
      },
    ],
  },
  {
    title: "Portfolio",
    url: "/portfolio",
    icon: Briefcase,
    items: [
      {
        title: "History",
        url: "/portfolio",
      },
      {
        title: "Overview",
        url: "/portfolio-overview",
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings/categories",
    icon: Settings2,
    items: [
      {
        title: "Categories",
        url: "/settings/categories",
      },
      {
        title: "Accounts",
        url: "/settings/accounts",
      },
    ],
  },
];

const tools = [
  {
    name: "COMPONENT TESTING",
    url: "/component-testing",
    icon: Frame,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user: token } = useAuth();
  const decoded = React.useMemo(() => (token ? decodeJwt(token) : null), [token]);
  const username = decoded?.username ?? "User";
  const role = decoded?.role ?? "";

  return (
    <Sidebar collapsible="icon" {...props}>
      <ProfileSwitcher name={username} role={role} />
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={tools} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: username }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
