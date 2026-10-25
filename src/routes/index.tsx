import { createFileRoute } from "@tanstack/react-router";
import { OverviewSection } from "@/components/sections/OverviewSection";
import { usePin } from "@/lib/pin";

export const Route = createFileRoute("/")({ component: RouteComponent });

function RouteComponent() {
  return <OverviewSection pin={usePin()} />;
}
