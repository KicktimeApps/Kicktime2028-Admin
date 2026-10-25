import { createFileRoute } from "@tanstack/react-router";
import { OverrideSection } from "@/components/sections/OverrideSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/korrektur")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  return (
    <Page title="Korrektur">
      <OverrideSection pin={pin} />
    </Page>
  );
}
