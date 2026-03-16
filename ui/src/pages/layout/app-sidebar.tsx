import * as React from "react";
import {
  Briefcase,
  Coins,
  Frame,
  Settings2,
  Sparkles,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/pages/layout/nav-main";
import { NavProjects } from "@/pages/layout/nav-projects";
import { NavUser } from "@/pages/layout/nav-user";
import { ProfileSwitcher } from "@/pages/layout/profile-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

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
    title: "Assets",
    url: "/user-assets",
    icon: Coins,
    items: [
      {
        title: "User Assets",
        url: "/user-assets",
      },
      {
        title: "Global Assets",
        url: "#",
        disabled: true,
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
    name: "AI Assistant",
    url: "/ai-chat",
    icon: Sparkles,
  },
  {
    name: "COMPONENT TESTING",
    url: "/component-testing",
    icon: Frame,
  },
];

function ProfileSwitcherSkeleton() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="cursor-default hover:bg-transparent active:bg-transparent"
          >
            <Skeleton className="size-8 rounded-md" />
            <div className="grid flex-1 gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}

function NavUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg">
          <Skeleton className="size-8 rounded-lg" />
          <div className="grid flex-1">
            <Skeleton className="h-4 w-24" />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { userProfile, userId } = useAuth();
  const isProfileLoaded = userId !== null;

  return (
    <Sidebar collapsible="icon" {...props}>
      {isProfileLoaded ? (
        <ProfileSwitcher
          name={userProfile.displayName}
          role={userProfile.role ?? ""}
        />
      ) : (
        <ProfileSwitcherSkeleton />
      )}
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={tools} />
      </SidebarContent>
      <SidebarFooter>
        {isProfileLoaded ? (
          <NavUser
            user={{
              name: userProfile.displayName,
              imageUrl: userProfile.imageUrl,
            }}
          />
        ) : (
          <NavUserSkeleton />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
