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
import { Link, useParams } from "@tanstack/react-router";
import { useUserId } from "@/hooks/use-auth";
import { useGetConnections } from "@/hooks/api/use-connectors-api";
import { CONNECTORS } from "./connector-meta";
import { TrueLayerConnect } from "./truelayer-connect";
import { Trading212Connect } from "./trading212-connect";

function ConnectorDetail({ providerKind }: { providerKind: string }) {
  const userId = useUserId();
  const { data: connections } = useGetConnections(userId);
  const meta = CONNECTORS.find((c) => c.kind === providerKind);
  const own = connections.filter((c) => c.provider_kind === providerKind);

  if (!meta) return <p>Unknown connector.</p>;

  return (
    <div className="space-y-4">
      <p>{meta.description}</p>
      <div>
        <h3>Connections</h3>
        {own.length === 0 && <p>No connections yet.</p>}
        <ul className="space-y-1">
          {own.map((c) => {
            const isError = c.status !== "active";
            return (
              <li key={c.id}>
                <Link
                  to="/settings/connectors/connections/$connectionId"
                  params={{ connectionId: c.id }}
                  className="underline"
                >
                  {c.id}
                </Link>{" "}
                — {c.credential_mode} —{" "}
                <span className={isError ? "text-destructive" : undefined}>
                  {c.status}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h3>Connect</h3>
        {providerKind === "truelayer" && <TrueLayerConnect />}
        {providerKind === "trading212" && <Trading212Connect />}
      </div>
    </div>
  );
}

export default function ConnectorDetailPage() {
  const { providerKind } = useParams({
    from: "/_auth/settings/connectors/$providerKind",
  });
  const meta = CONNECTORS.find((c) => c.kind === providerKind);
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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/settings/connectors">
                  Connected Services
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{meta?.name ?? providerKind}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="p-4">
        <AsyncBoundary>
          <ConnectorDetail providerKind={providerKind} />
        </AsyncBoundary>
      </div>
    </>
  );
}
