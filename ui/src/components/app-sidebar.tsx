import * as React from "react";
import {
  BookOpen,
  Bot,
  Frame,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: () => null,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: () => null,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: () => null,
      plan: "Free",
    },
  ],
  navMain: [
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
      url: "#",
      icon: Bot,
      items: [
        {
          title: "History",
          url: "/portfolio",
        },
        {
          title: "Accounts",
          url: "#",
        },
      ],
    },
    {
      title: "Analytics",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
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
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "COMPONENT TESTING",
      url: "/component-testing",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <TeamSwitcher teams={data.teams} />
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
