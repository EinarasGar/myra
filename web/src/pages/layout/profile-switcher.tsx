import { Button } from "@/components/ui/button";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function ProfileSwitcher({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="cursor-default hover:bg-transparent active:bg-transparent"
          >
            <Button
              size="icon-sm"
              render={<span />}
              nativeButton={false}
              className="size-8 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="block size-4 bg-current"
                style={{
                  WebkitMaskImage: "url(/sverto.svg)",
                  maskImage: "url(/sverto.svg)",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
            </Button>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs">{role}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
