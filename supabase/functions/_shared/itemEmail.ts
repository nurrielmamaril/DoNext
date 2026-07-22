// Shared by send-item-email (immediate, JWT-scoped) and send-scheduled-emails
// (cron-triggered, service-role) — the two functions differ only in how the
// Supabase client passed in is authenticated; the query/HTML-building logic
// is identical either way.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "npm:date-fns@4.4.0";

const priorityLabels: Record<string, string> = { low: "Low", high: "High", urgent: "Urgent" };
const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting: "Waiting",
  completed: "Completed",
};

function formatDueDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

function formatDueTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a");
}

const HTML_TAG_RE = /<(p|h[1-6]|ul|ol|li|strong|em|b|i|u|br|blockquote|a)[\s/>]/i;

export function looksLikeHtml(content: string): boolean {
  return HTML_TAG_RE.test(content);
}

export const FOOTER =
  '<p style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e5e5;color:#888;font-size:12px">This email was sent from DoNext, Nurriel Mamaril\'s proprietary productivity software.</p>';

export type ItemEmailResult = { subject: string; html: string } | { error: string; status: number };

export async function buildItemEmailContent(
  supabase: SupabaseClient,
  type: "task" | "note",
  id: string,
  customSubject?: string
): Promise<ItemEmailResult> {
  let subject: string;
  let html: string;

  if (type === "task") {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (taskError || !task) {
      return { error: "Task not found", status: 404 };
    }

    const { data: subtasks } = await supabase
      .from("subtasks")
      .select("title, is_complete")
      .eq("task_id", id)
      .order("position", { ascending: true });

    const dueLine = task.due_date
      ? `${formatDueDate(task.due_date)}${task.due_time ? ` at ${formatDueTime(task.due_time)}` : ""}`
      : null;

    subject = `Task: ${task.title}`;
    const lines: string[] = [
      `<p><strong>Priority:</strong> ${priorityLabels[task.priority] ?? task.priority}</p>`,
      `<p><strong>Status:</strong> ${statusLabels[task.status] ?? task.status}</p>`,
    ];
    if (dueLine) lines.push(`<p><strong>Due:</strong> ${dueLine}</p>`);
    if (task.is_recurring) lines.push(`<p><strong>Recurring:</strong> Yes</p>`);
    if (task.description) {
      const descriptionHtml = looksLikeHtml(task.description)
        ? task.description
        : `<p>${task.description.replace(/\n/g, "<br>")}</p>`;
      lines.push(`<p><strong>Description:</strong></p>${descriptionHtml}`);
    }
    if (subtasks && subtasks.length > 0) {
      const items = subtasks
        .map((s: { title: string; is_complete: boolean }) => `<li>${s.is_complete ? "✅" : "⬜"} ${s.title}</li>`)
        .join("");
      lines.push(`<p><strong>Subtasks:</strong></p><ul>${items}</ul>`);
    }
    html = lines.join("\n") + FOOTER;
  } else {
    const { data: note, error: noteError } = await supabase.from("notes").select("*").eq("id", id).single();
    if (noteError || !note) {
      return { error: "Note not found", status: 404 };
    }

    subject = `Note: ${note.title || "Untitled"}`;
    const rawContent = note.content || "";
    const contentHtml = looksLikeHtml(rawContent) ? rawContent : `<p>${rawContent.replace(/\n/g, "<br>")}</p>`;
    html = contentHtml + FOOTER;
  }

  if (customSubject && customSubject.trim()) {
    subject = customSubject.trim();
  }

  return { subject, html };
}

export async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  resendApiKey: string,
  resendFrom: string
): Promise<{ ok: boolean; error?: string; status?: number }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: resendFrom, to: [to], subject, html }),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    return { ok: false, error: `Resend error ${res.status}: ${bodyText}`, status: 502 };
  }
  return { ok: true };
}
