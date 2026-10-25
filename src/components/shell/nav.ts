import {
  BarChart3,
  CalendarCheck,
  Inbox,
  LayoutGrid,
  Megaphone,
  MessageSquareText,
  Pencil,
  Radio,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: "requests" | "alerts";
};

/** Alle Bereiche in der Reihenfolge der Seitenleiste. */
export const NAV: NavItem[] = [
  { to: "/", label: "Übersicht", icon: LayoutGrid },
  { to: "/live", label: "Live-Daten", icon: Radio, badge: "alerts" },
  { to: "/spiele", label: "Spiele-Check", icon: CalendarCheck },
  { to: "/korrektur", label: "Korrektur", icon: Pencil },
  { to: "/tipprunden", label: "Tipprunden", icon: Users },
  { to: "/antraege", label: "Anträge", icon: Inbox, badge: "requests" },
  { to: "/mitteilungen", label: "Mitteilungen", icon: Megaphone },
  { to: "/statistik", label: "Statistik", icon: BarChart3 },
  { to: "/feedback", label: "Feedback", icon: MessageSquareText },
  { to: "/system", label: "System", icon: Settings2 },
];

/** Handy: die wichtigsten vier unten, der Rest unter „Mehr“. */
export const TABS = ["/", "/live", "/korrektur", "/antraege"];
