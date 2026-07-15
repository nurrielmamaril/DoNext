"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recurrencePresets, type RecurrenceRule } from "@/lib/utils/recurrence";

const presetItems: Record<string, string> = {
  none: "Doesn't repeat",
  ...Object.fromEntries(recurrencePresets.map((p, i) => [String(i), p.label])),
  custom: "Custom...",
};

function ruleToKey(rule: RecurrenceRule | null): string {
  if (!rule) return "none";
  const presetIndex = recurrencePresets.findIndex(
    (p) => JSON.stringify(p.rule) === JSON.stringify(rule)
  );
  if (presetIndex >= 0) return String(presetIndex);
  return "custom";
}

interface RecurrencePickerProps {
  rule: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

export function RecurrencePicker({ rule, onChange }: RecurrencePickerProps) {
  const key = ruleToKey(rule);
  const customRule = rule?.freq === "custom" ? rule : { freq: "custom" as const, unit: "week" as const, interval: 1 };

  function handleSelect(value: string | null) {
    if (!value || value === "none") {
      onChange(null);
    } else if (value === "custom") {
      onChange(customRule);
    } else {
      onChange(recurrencePresets[Number(value)].rule);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Repeat</Label>
      <Select items={presetItems} value={key} onValueChange={handleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Doesn&apos;t repeat</SelectItem>
          {recurrencePresets.map((preset, i) => (
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
            onChange={(e) =>
              onChange({ ...customRule, interval: Math.max(1, Number(e.target.value) || 1) })
            }
            className="w-16"
          />
          <Select
            items={{ day: "day(s)", week: "week(s)", month: "month(s)" }}
            value={customRule.unit}
            onValueChange={(unit) => onChange({ ...customRule, unit: unit as "day" | "week" | "month" })}
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
