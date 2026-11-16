// Fixed "now" for the prototype — Oct 28, 2026 — so mock
// timestamps read consistently across the app (also used by formatRelative below
// and the mobile field-operator "Today" view).
export const MOCK_NOW_ISO = "2026-10-28T12:00:00-07:00";
export const mockNow = () => new Date(MOCK_NOW_ISO);

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(iso: string): boolean {
  return sameDay(new Date(iso), mockNow());
}

export function isTomorrow(iso: string): boolean {
  return sameDay(new Date(iso), addDays(mockNow(), 1));
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Short weekday + day-of-month, used by the schedule rail (e.g. { day: "30", weekday: "Tue" }).
export function dayParts(iso: string): { day: string; weekday: string } {
  const d = new Date(iso);
  return {
    day: String(d.getDate()),
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
  };
}

// "30th" / "1st" / "2nd" / "3rd" — ordinal day of the month. 11th–13th are the
// exceptions that the mod-10 rule alone gets wrong.
export function ordinalDay(day: number): string {
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  return `${day}${suffix}`;
}

// "Tuesday, 30th" — the day heading above each group in the schedule list.
export function dayHeading(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { weekday: "long" })}, ${ordinalDay(d.getDate())}`;
}

// "Jun 30 – Jul 5" style range label for the week navigator.
export function formatRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = mockNow().getTime();
  const diffMinutes = Math.round((now - then) / 60000);

  if (Math.abs(diffMinutes) < 1) return "just now";
  if (diffMinutes > 0) {
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.round(diffMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }
  const future = Math.abs(diffMinutes);
  if (future < 60) return `in ${future}m`;
  const hours = Math.round(future / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

// Google Maps search link for an address string — opens the native Maps app on
// phones and google.com/maps on desktop.
export function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
