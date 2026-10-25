import { createFileRoute } from "@tanstack/react-router";
import { FeedbackSection } from "@/components/sections/FeedbackSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/feedback")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  return (
    <Page title="Feedback" text="Rückmeldungen aus der App.">
      <FeedbackSection pin={pin} />
    </Page>
  );
}
