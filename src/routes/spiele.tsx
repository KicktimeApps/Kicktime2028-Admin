import { createFileRoute } from "@tanstack/react-router";
import { MatchCheckSection } from "@/components/sections/MatchCheckSection";
import { Page } from "@/components/shell/TeamShell";

export const Route = createFileRoute("/spiele")({ component: RouteComponent });

function RouteComponent() {
  return (
    <Page title="Spiele-Check" text="Was OpenLigaDB, ESPN und Korrekturen zu jedem Spiel melden.">
      <MatchCheckSection />
    </Page>
  );
}
