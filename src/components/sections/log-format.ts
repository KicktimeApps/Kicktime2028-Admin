import {
  BellRing,
  Clock,
  Database,
  Megaphone,
  MessageSquareText,
  Pencil,
  Radio,
  ShieldBan,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Symbol je Art der Team-Aktion. */
export function logIcon(action: string): LucideIcon {
  if (["set", "clear", "clear_overrides"].includes(action)) return Pencil;
  if (action === "fixtures") return Clock;
  if (["set_source"].includes(action)) return Radio;
  if (["clear_cache", "reset_results"].includes(action)) return Database;
  if (["set_announcement", "broadcast"].includes(action)) return Megaphone;
  if (["team_device", "alert_test"].includes(action)) return BellRing;
  if (action === "feedback_delete") return MessageSquareText;
  if (["ban_global", "unban_global", "decide", "member_unban"].includes(action)) return ShieldBan;
  return Users;
}
