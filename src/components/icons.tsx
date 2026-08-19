import type { ComponentType } from "react";
import {
  Inbox,
  Shield,
  Users,
  MapPin,
  CalendarDays,
  Trophy,
  type LucideProps,
} from "lucide-react";

// Project-wide icon set — Lucide line icons (one consistent family). The old
// antd names are kept as aliases so existing call sites don't churn; each is
// sized in `em` so it scales with the surrounding font-size like before.
function sized(Icon: ComponentType<LucideProps>, label: string) {
  const C = (props: LucideProps) => <Icon size="1em" strokeWidth={2} {...props} />;
  C.displayName = label;
  return C;
}

export const InboxOutlined = sized(Inbox, "Inbox");
export const FlagOutlined = sized(Shield, "Teams");
export const UserOutlined = sized(Users, "Players");
export const EnvironmentOutlined = sized(MapPin, "Venue");
export const CalendarOutlined = sized(CalendarDays, "Calendar");
export const TrophyOutlined = sized(Trophy, "Trophy");
