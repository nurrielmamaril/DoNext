import { addDays, addWeeks, addMonths, parseISO } from "date-fns";

export interface ReminderRecurrenceRule {
  unit: "day" | "week" | "month";
  interval: number;
}

const unitLabels: Record<ReminderRecurrenceRule["unit"], string> = {
  day: "day",
  week: "week",
  month: "month",
};

export function describeReminderRecurrence(rule: ReminderRecurrenceRule): string {
  const label = unitLabels[rule.unit];
  return rule.interval === 1 ? `Every ${label}` : `Every ${rule.interval} ${label}s`;
}

export function computeNextRemindAt(currentRemindAt: string, rule: ReminderRecurrenceRule): string {
  const current = parseISO(currentRemindAt);
  const next =
    rule.unit === "day"
      ? addDays(current, rule.interval)
      : rule.unit === "week"
        ? addWeeks(current, rule.interval)
        : addMonths(current, rule.interval);
  return next.toISOString();
}
