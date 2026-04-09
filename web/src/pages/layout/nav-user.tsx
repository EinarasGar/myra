import { ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { router } from "@/router";
import { ThemeSwitcher } from "./theme-switcher";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    imageUrl?: string | null;
  };
}) {
  const { logout } = useAuth();
  const initials = user.name.substring(0, 2).toUpperCase() || "?";

  async function logoutHandler() {
    await logout();
    router.navigate({ to: "/login" });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              >
                <Avatar>
                  {user.imageUrl && (
                    <AvatarImage src={user.imageUrl} alt={user.name} />
                  )}
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                </div>
                <ChevronsUpDown />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <Item size="xs">
                  <ItemMedia>
                    <Avatar>
                      {user.imageUrl && (
                        <AvatarImage src={user.imageUrl} alt={user.name} />
                      )}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{user.name}</ItemTitle>
                  </ItemContent>
                </Item>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <ThemeSwitcher />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logoutHandler}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
