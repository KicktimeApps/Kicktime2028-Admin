import { createFileRoute } from "@tanstack/react-router";
import { GroupsSection } from "@/components/sections/GroupsSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/tipprunden")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  return (
    <Page title="Tipprunden" text="Alle Runden, Mitglieder und Sperren.">
      <GroupsSection pin={pin} />
    </Page>
  );
}
