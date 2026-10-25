import { createFileRoute } from "@tanstack/react-router";
import { LogSection } from "@/components/sections/LogSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/protokoll")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  return (
    <Page title="Protokoll" text="Was das KickTime-Team wann geändert hat.">
      <LogSection pin={pin} />
    </Page>
  );
}
