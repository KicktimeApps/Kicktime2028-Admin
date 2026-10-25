import { createFileRoute } from "@tanstack/react-router";
import { StatsSection } from "@/components/sections/StatsSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/statistik")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  return (
    <Page title="Statistik" text="Wie viele die App nutzen – ohne persönliche Daten.">
      <StatsSection pin={pin} />
    </Page>
  );
}
