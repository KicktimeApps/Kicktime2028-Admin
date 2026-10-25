import { createFileRoute } from "@tanstack/react-router";
import { RequestsSection } from "@/components/sections/RequestsSection";
import { Page } from "@/components/shell/TeamShell";
import { useBadges } from "@/hooks/useBadges";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/antraege")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  const refresh = useBadges((s) => s.refresh);
  return (
    <Page title="Anträge" text="Entsperrungsanträge und überall Gesperrte.">
      <RequestsSection pin={pin} onChange={() => void refresh()} />
    </Page>
  );
}
