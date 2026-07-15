import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  parseISO,
  startOfDay,
} from "date-fns";

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export function formatDueTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a");
}

export function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === "completed") return false;
  return isPast(startOfDay(parseISO(dateStr))) && !isToday(parseISO(dateStr));
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}
