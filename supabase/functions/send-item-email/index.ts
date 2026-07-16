// Sends a task's or note's details to an arbitrary email address, on behalf
// of the signed-in user who owns it. Unlike send-due-reminders (a cron-only
// endpoint using a shared secret), this is invoked directly by a logged-in
// user from the client, so it relies on normal Supabase Auth JWT
// verification instead — deployed WITHOUT --no-verify-jwt. The Supabase
// client below is scoped to the caller's own JWT (not the service role
// key), so Row Level Security itself enforces "you can only email your own
// tasks/notes" with no extra authorization code needed.
import { createClient } from "npm:@supabase/supabase-js@2";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "npm:date-fns@4.4.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "DoNext <onboarding@resend.dev>";

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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const FOOTER =
  '<p style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e5e5;color:#888;font-size:12px">This email was sent from DoNext, Nurriel Mamaril\'s proprietary productivity software.</p>';

// This function is called directly from the browser (unlike send-due-reminders,
// which is only ever called server-side by pg_cron), so it needs CORS headers
// or the browser blocks the response before the client ever sees it.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!RESEND_API_KEY) {
    return jsonResponse({ error: "Email sending isn't configured" }, 500);
  }

  let body: { type?: string; id?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const { type, id, to } = body;
  if (type !== "task" && type !== "note") {
    return jsonResponse({ error: "type must be \"task\" or \"note\"" }, 400);
  }
  if (!id || !to || !isValidEmail(to)) {
    return jsonResponse({ error: "A valid recipient email is required" }, 400);
  }

  let subject: string;
  let html: string;

  if (type === "task") {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*, lists(name)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (taskError || !task) {
      return jsonResponse({ error: "Task not found" }, 404);
    }

    const { data: subtasks } = await supabase
      .from("subtasks")
      .select("title, is_complete")
      .eq("task_id", id)
      .order("position", { ascending: true });

    const listName = (task as unknown as { lists: { name: string } | null }).lists?.name;
    const dueLine = task.due_date
      ? `${formatDueDate(task.due_date)}${task.due_time ? ` at ${formatDueTime(task.due_time)}` : ""}`
      : null;

    subject = `Task: ${task.title}`;
    const lines: string[] = [
      `<h2 style="margin:0 0 12px">${task.title}</h2>`,
      `<p><strong>Priority:</strong> ${priorityLabels[task.priority] ?? task.priority}</p>`,
      `<p><strong>Status:</strong> ${statusLabels[task.status] ?? task.status}</p>`,
    ];
    if (listName) lines.push(`<p><strong>Category:</strong> ${listName}</p>`);
    if (dueLine) lines.push(`<p><strong>Due:</strong> ${dueLine}</p>`);
    if (task.is_recurring) lines.push(`<p><strong>Recurring:</strong> Yes</p>`);
    if (task.description) {
      lines.push(`<p><strong>Description:</strong><br>${task.description.replace(/\n/g, "<br>")}</p>`);
    }
    if (subtasks && subtasks.length > 0) {
      const items = subtasks
        .map((s: { title: string; is_complete: boolean }) => `<li>${s.is_complete ? "✅" : "⬜"} ${s.title}</li>`)
        .join("");
      lines.push(`<p><strong>Subtasks:</strong></p><ul>${items}</ul>`);
    }
    html = lines.join("\n") + FOOTER;
  } else {
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("*, lists(name)")
      .eq("id", id)
      .single();
    if (noteError || !note) {
      return jsonResponse({ error: "Note not found" }, 404);
    }

    const listName = (note as unknown as { lists: { name: string } | null }).lists?.name;
    subject = `Note: ${note.title || "Untitled"}`;
    const lines: string[] = [`<h2 style="margin:0 0 12px">${note.title || "Untitled"}</h2>`];
    if (listName) lines.push(`<p><strong>Category:</strong> ${listName}</p>`);
    const rawContent = note.content || "";
    const looksLikeHtml = /<(p|h[1-6]|ul|ol|li|strong|em|b|i|u|br|blockquote|a)[\s/>]/i.test(rawContent);
    lines.push(looksLikeHtml ? rawContent : `<p>${rawContent.replace(/\n/g, "<br>")}</p>`);
    html = lines.join("\n") + FOOTER;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    return jsonResponse({ error: `Resend error ${res.status}: ${bodyText}` }, 502);
  }

  return jsonResponse({ ok: true });
});
