import { BookOpenText, Building2, Check, Flag, Store, Target, User } from "lucide-react";
import type { IconComponent } from "../../../../components/PolarisIcon";
import { formatDate, formatRelative, mockNow } from "../../../../lib/format";
import type { MessageSeverity, MessageType } from "../../context/MessagesContext";

// When a message arrived. Relative while it is in the prototype's past; some
// seeded SOP runs are dated after the mock "now", and "in 46d" for something
// that already happened reads wrong, so those show the date.
export function messageWhen(iso: string) {
  return new Date(iso).getTime() <= mockNow().getTime() ? formatRelative(iso) : formatDate(iso);
}

// The seven message types, in the order the badge sheet lists them. A type
// is what the message is about, not who sent it: Sol writes most of them.
export const MESSAGE_TYPES: MessageType[] = ["sop", "goal", "project", "audit", "coworker", "no", "brand"];

// Each type's badge: a white glyph on a filled circle.
// A glyph can be lucide or a Polaris icon wrapped with fromPolaris.
const TYPE_BADGE: Record<MessageType, { icon: IconComponent; color: string }> = {
  sop: { icon: BookOpenText, color: "#cfcb6c" },
  goal: { icon: Target, color: "#6cc4b2" },
  project: { icon: Flag, color: "#a98be6" },
  audit: { icon: Check, color: "#5d9de0" },
  coworker: { icon: User, color: "#8fb0d4" },
  no: { icon: Building2, color: "#d27d7d" },
  brand: { icon: Store, color: "#3447b5" },
};

export function MessageTypeBadge({ type, size = 28, className = "" }: { type: MessageType; size?: number; className?: string }) {
  const { icon: Icon, color } = TYPE_BADGE[type];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${className}`}
      style={{ width: size, height: size, background: color }}
      aria-hidden
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.25} />
    </span>
  );
}

// The left edge of a message row, by severity. Shared by the Messages list
// and the simplified row on the SOP Requests page.
export const SEVERITY_BORDER: Record<MessageSeverity, string> = {
  critical: "border-l-[#e5485f]",
  high: "border-l-[#f59a5b]",
  medium: "border-l-[#f5cf4a]",
  normal: "border-l-[#5a9fea]",
  low: "border-l-[#b57ae6]",
};
