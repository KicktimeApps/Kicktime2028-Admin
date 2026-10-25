import { createFileRoute } from "@tanstack/react-router";
import { GroupBoardSection } from "@/components/sections/GroupBoardSection";
import { Page } from "@/components/shell/TeamShell";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/tipprunden_/$groupId")({ component: RouteComponent });

function RouteComponent() {
  const { groupId } = Route.useParams();
  return (
    <Page title="Rundentabelle">
      <GroupBoardSection pin={usePin()} groupId={groupId} />
    </Page>
  );
}
