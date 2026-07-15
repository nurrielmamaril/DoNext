import Papa from "papaparse";
import type { TaskPriority, TaskStatus } from "@/lib/types/database.types";

export interface ExportTaskRow {
  title: string;
  description: string | null;
  listName: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

const CSV_COLUMNS = [
  "title",
  "description",
  "list",
  "priority",
  "status",
  "due_date",
  "due_time",
  "is_recurring",
  "recurrence_rule",
  "created_at",
  "completed_at",
] as const;

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function tasksToCSV(rows: ExportTaskRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((row) =>
    [
      row.title,
      row.description ?? "",
      row.listName ?? "",
      row.priority,
      row.status,
      row.due_date ?? "",
      row.due_time ?? "",
      String(row.is_recurring),
      row.recurrence_rule ? JSON.stringify(row.recurrence_rule) : "",
      row.created_at,
      row.completed_at ?? "",
    ]
      .map((value) => csvEscape(String(value)))
      .join(",")
  );
  return [header, ...lines].join("\r\n");
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

const VALID_PRIORITIES: TaskPriority[] = ["low", "high", "urgent"];
const VALID_STATUSES: TaskStatus[] = ["not_started", "in_progress", "waiting", "completed"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export type ImportRowStatus = "ok" | "warning" | "error";

export interface ImportRowResult {
  title: string;
  description: string | null;
  listName: string | null;
  willCreateList: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  rowStatus: ImportRowStatus;
  messages: string[];
}

export function validateImportRow(
  row: Record<string, string>,
  existingListNames: string[]
): ImportRowResult {
  const messages: string[] = [];
  const title = (row.title ?? "").trim();

  if (!title) {
    return {
      title: "",
      description: null,
      listName: null,
      willCreateList: false,
      priority: "low",
      status: "not_started",
      due_date: null,
      due_time: null,
      is_recurring: false,
      recurrence_rule: null,
      rowStatus: "error",
      messages: ["Missing title — row skipped"],
    };
  }

  const description = (row.description ?? "").trim() || null;

  const rawPriority = (row.priority ?? "").trim().toLowerCase();
  let priority: TaskPriority = "low";
  if (rawPriority) {
    if (VALID_PRIORITIES.includes(rawPriority as TaskPriority)) {
      priority = rawPriority as TaskPriority;
    } else {
      messages.push(`Unknown priority "${row.priority}" — defaulted to Low`);
    }
  }

  const rawStatus = (row.status ?? "").trim().toLowerCase();
  let status: TaskStatus = "not_started";
  if (rawStatus) {
    if (VALID_STATUSES.includes(rawStatus as TaskStatus)) {
      status = rawStatus as TaskStatus;
    } else {
      messages.push(`Unknown status "${row.status}" — defaulted to Not Started`);
    }
  }

  const rawDueDate = (row.due_date ?? "").trim();
  let due_date: string | null = null;
  if (rawDueDate) {
    if (DATE_RE.test(rawDueDate) && !Number.isNaN(Date.parse(rawDueDate))) {
      due_date = rawDueDate;
    } else {
      messages.push(`Invalid due date "${row.due_date}" — cleared`);
    }
  }

  const rawDueTime = (row.due_time ?? "").trim();
  let due_time: string | null = null;
  if (rawDueTime) {
    if (TIME_RE.test(rawDueTime)) {
      due_time = rawDueTime;
    } else {
      messages.push(`Invalid due time "${row.due_time}" — cleared`);
    }
  }

  const rawRecurring = (row.is_recurring ?? "").trim().toLowerCase();
  const is_recurring = rawRecurring === "true" || rawRecurring === "1";

  const rawRule = (row.recurrence_rule ?? "").trim();
  let recurrence_rule: Record<string, unknown> | null = null;
  if (rawRule) {
    try {
      recurrence_rule = JSON.parse(rawRule);
    } catch {
      messages.push("Invalid recurrence rule — cleared");
    }
  }

  const rawList = (row.list ?? "").trim();
  let listName: string | null = null;
  let willCreateList = false;
  if (rawList) {
    const match = existingListNames.find((n) => n.toLowerCase() === rawList.toLowerCase());
    if (match) {
      listName = match;
    } else {
      listName = rawList;
      willCreateList = true;
      messages.push(`Unknown list "${rawList}" — will create it`);
    }
  }

  return {
    title,
    description,
    listName,
    willCreateList,
    priority,
    status,
    due_date,
    due_time,
    is_recurring,
    recurrence_rule,
    rowStatus: messages.length > 0 ? "warning" : "ok",
    messages,
  };
}
