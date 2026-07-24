import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AsyncBoundary } from "@/components/async-boundary";
import { Link } from "@tanstack/react-router";
import { useUserId } from "@/hooks/use-auth";
import { useGetConnections } from "@/hooks/api/use-connectors-api";
import { CONNECTORS } from "./connector-meta";

function ConnectorsList() {
  const userId = useUserId();
  const { data: connections } = useGetConnections(userId);
  return (
    <ul className="space-y-2">
      {CONNECTORS.map((c) => {
        const active = connections.filter(
          (conn) => conn.provider_kind === c.kind && conn.status === "active",
        ).length;
        return (
          <li key={c.kind}>
            <Link
              to="/settings/connectors/$providerKind"
              params={{ providerKind: c.kind }}
              className="underline"
            >
              {c.name}
            </Link>{" "}
            — {c.description}{" "}
            {active > 0 && <span>({active} connected)</span>}
          </li>
        );
      })}
    </ul>
  );
}

export default function ConnectorsPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Connected Services</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="p-4">
        <AsyncBoundary>
          <ConnectorsList />
        </AsyncBoundary>
      </div>
    </>
  );
}
