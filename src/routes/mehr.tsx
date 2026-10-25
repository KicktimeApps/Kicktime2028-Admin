import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { NAV, TABS } from "@/components/shell/nav";
import { Page } from "@/components/shell/TeamShell";
import { useBadges } from "@/hooks/useBadges";

export const Route = createFileRoute("/mehr")({ component: RouteComponent });

/** Handy: alle Bereiche, die unten keinen eigenen Reiter haben. */
function RouteComponent() {
  const badges = useBadges();
  return (
    <Page title="Mehr">
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {NAV.filter((n) => !TABS.includes(n.to)).map(({ to, label, icon: Icon, badge }) => (
          <li key={to}>
            <Link to={to} className="flex h-14 items-center gap-3 px-4 text-[15px] font-medium">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              {badge && badges[badge] > 0 && (
                <span className="rounded-full bg-gold px-2 text-[12px] font-bold text-gold-foreground">
                  {badges[badge]}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
