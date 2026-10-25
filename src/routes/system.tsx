import { createFileRoute } from "@tanstack/react-router";
import { SystemSection } from "@/components/sections/SystemSection";
import { Page } from "@/components/shell/TeamShell";

export const Route = createFileRoute("/system")({ component: RouteComponent });

function RouteComponent() {
  return (
    <Page title="System" text="Mitteilungen, Darstellung und dieses Gerät.">
      <SystemSection />
    </Page>
  );
}
