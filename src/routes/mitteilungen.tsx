import { createFileRoute } from "@tanstack/react-router";
import { MessagesSection } from "@/components/sections/MessagesSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/mitteilungen")({ component: RouteComponent });

function RouteComponent() {
  const pin = usePin();
  return (
    <Page title="Mitteilungen" text="Hinweis in der App und Push an alle.">
      <MessagesSection pin={pin} />
    </Page>
  );
}
