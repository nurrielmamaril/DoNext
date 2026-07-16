"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ReminderRecurrenceRule } from "@/lib/utils/reminderRecurrence";

const presets: { label: string; rule: ReminderRecurrenceRule }[] = [
  { label: "Daily", rule: { unit: "day", interval: 1 } },
  { label: "Weekly", rule: { unit: "week", interval: 1 } },
  { label: "Every 2 weeks", rule: { unit: "week", interval: 2 } },
  { label: "Monthly", rule: { unit: "month", interval: 1 } },
];

const presetItems: Record<string, string> = {
  none: "Doesn't repeat",
  ...Object.fromEntries(presets.map((p, i) => [String(i), p.label])),
  custom: "Custom...",
};

function ruleToKey(rule: ReminderRecurrenceRule | null): string {
  if (!rule) return "none";
  const presetIndex = presets.findIndex((p) => JSON.stringify(p.rule) === JSON.stringify(rule));
  if (presetIndex >= 0) return String(presetIndex);
  return "custom";
}

interface ReminderRecurrencePickerProps {
  rule: ReminderRecurrenceRule | null;
  onChange: (rule: ReminderRecurrenceRule | null) => void;
}

export function ReminderRecurrencePicker({ rule, onChange }: ReminderRecurrencePickerProps) {
  const key = ruleToKey(rule);
  const customRule = key === "custom" && rule ? rule : { unit: "week" as const, interval: 1 };

  function handleSelect(value: string | null) {
    if (!value || value === "none") {
      onChange(null);
    } else if (value === "custom") {
      onChange(customRule);
    } else {
      onChange(presets[Number(value)].rule);
    }
  }

  return (
    <div className="space-y-1.5">
      <Select items={presetItems} value={key} onValueChange={handleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Doesn&apos;t repeat</SelectItem>
          {presets.map((preset, i) => (
            <SelectItem key={i} value={String(i)}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom...</SelectItem>
        </SelectContent>
      </Select>

      {key === "custom" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Every</span>
          <Input
            type="number"
            min={1}
            value={customRule.interval}
            onChange={(e) => onChange({ ...customRule, interval: Math.max(1, Number(e.target.value) || 1) })}
            className="w-16"
          />
          <Select
            items={{ day: "day(s)", week: "week(s)", month: "month(s)" }}
            value={customRule.unit}
            onValueChange={(unit) => onChange({ ...customRule, unit: unit as ReminderRecurrenceRule["unit"] })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">day(s)</SelectItem>
              <SelectItem value="week">week(s)</SelectItem>
              <SelectItem value="month">month(s)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
