import { addDays, addMonths, addWeeks, format, getDay, isSaturday, isSunday, parseISO } from "date-fns";

export type RecurrenceRule =
  | { freq: "weekday" }
  | { freq: "weekly"; interval: number; dayOfWeek: number }
  | { freq: "monthly"; interval: number }
  | { freq: "custom"; unit: "day" | "week" | "month"; interval: number };

export const recurrencePresets: { label: string; rule: RecurrenceRule }[] = [
  { label: "Every weekday", rule: { freq: "weekday" } },
  { label: "Every week", rule: { freq: "weekly", interval: 1, dayOfWeek: 1 } },
  { label: "Every 2 weeks", rule: { freq: "weekly", interval: 2, dayOfWeek: 1 } },
  { label: "Every month", rule: { freq: "monthly", interval: 1 } },
];

export function describeRecurrence(rule: RecurrenceRule): string {
  switch (rule.freq) {
    case "weekday":
      return "Every weekday";
    case "weekly": {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[rule.dayOfWeek] ?? "";
      return rule.interval === 1 ? `Every ${dayName}` : `Every ${rule.interval} weeks, on ${dayName}`;
    }
    case "monthly":
      return rule.interval === 1 ? "Every month" : `Every ${rule.interval} months`;
    case "custom":
      return `Every ${rule.interval} ${rule.unit}${rule.interval > 1 ? "s" : ""}`;
  }
}

export function computeNextDueDate(currentDueDate: string, rule: RecurrenceRule): string {
  const current = parseISO(currentDueDate);

  if (rule.freq === "weekday") {
    let next = addDays(current, 1);
    while (isSaturday(next) || isSunday(next)) next = addDays(next, 1);
    return format(next, "yyyy-MM-dd");
  }

  if (rule.freq === "weekly") {
    let next = addWeeks(current, rule.interval);
    // Keep the chosen day-of-week aligned even if the original due date drifted.
    while (getDay(next) !== rule.dayOfWeek) next = addDays(next, 1);
    return format(next, "yyyy-MM-dd");
  }

  if (rule.freq === "monthly") {
    return format(addMonths(current, rule.interval), "yyyy-MM-dd");
  }

  // custom
  if (rule.unit === "day") return format(addDays(current, rule.interval), "yyyy-MM-dd");
  if (rule.unit === "week") return format(addWeeks(current, rule.interval), "yyyy-MM-dd");
  return format(addMonths(current, rule.interval), "yyyy-MM-dd");
}
