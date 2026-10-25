import { createFileRoute } from "@tanstack/react-router";
import { LiveSection } from "@/components/sections/LiveSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/live")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  return (
    <Page title="Live-Daten" text="Wächter, Datenquellen und gespeicherte Ergebnisse.">
      <LiveSection pin={pin} />
    </Page>
  );
}
