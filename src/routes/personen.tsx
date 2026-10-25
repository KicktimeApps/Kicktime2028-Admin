import { createFileRoute } from "@tanstack/react-router";
import { PersonsSection } from "@/components/sections/PersonsSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/personen")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  return (
    <Page title="Personen" text="Suche über alle Tipprunden – mit Sperren und Anträgen.">
      <PersonsSection pin={pin} />
    </Page>
  );
}
