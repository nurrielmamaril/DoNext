// Runs on a schedule (see supabase/migrations for the pg_cron job that calls
// this). Finds reminders that just came due and delivers each one via its
// chosen method (browser push or email), then marks it as sent.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "npm:date-fns@4.4.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:no-reply@example.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "DoNext <onboarding@resend.dev>";
// Deployed with --no-verify-jwt since the only caller is our own scheduled
// cron job, not end users — this shared secret takes the place of Supabase
// Auth's JWT check so the endpoint isn't wide open to the internet.
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type TaskInfo = {
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
};

function formatDueDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function formatDueTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, "h:mm a");
}

function dueLabel(task: TaskInfo): string | null {
  if (!task.due_date) return null;
  const label = formatDueDate(task.due_date);
  return task.due_time ? `${label} at ${formatDueTime(task.due_time)}` : label;
}

const HTML_TAG_RE = /<(p|h[1-6]|ul|ol|li|strong|em|b|i|u|br|blockquote|a)[\s/>]/i;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function descriptionToHtml(description: string): string {
  return HTML_TAG_RE.test(description) ? description : `<p>${escapeHtml(description)}</p>`;
}

async function sendBrowserPush(userId: string, taskTitle: string) {
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  const payload = JSON.stringify({
    title: "DoNext reminder",
    body: taskTitle,
    url: "/dashboard",
  });

  let sent = 0;
  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      // Subscription is no longer valid (browser data cleared, device
      // unenrolled, etc.) — remove it so we stop trying.
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
  return sent;
}

async function sendEmail(userId: string, task: TaskInfo): Promise<{ ok: boolean; debug: string }> {
  if (!RESEND_API_KEY) return { ok: false, debug: "no RESEND_API_KEY configured" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  if (profileError) return { ok: false, debug: `profile lookup error: ${profileError.message}` };
  if (!profile?.email) return { ok: false, debug: "profile has no email" };

  const due = dueLabel(task);
  const subject = due ? `Reminder: ${task.title} | Due ${due}` : `Reminder: ${task.title}`;
  const htmlLines = [
    `<p>This is a reminder for your task:</p>`,
    `<p><strong>Title:</strong> ${task.title}</p>`,
  ];
  if (task.description) {
    htmlLines.push(`<p><strong>Description:</strong></p>${descriptionToHtml(task.description)}`);
  }
  if (due) htmlLines.push(`<p><strong>Due Date:</strong> ${due}</p>`);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [profile.email],
      subject,
      html: htmlLines.join("\n"),
    }),
  });
  const bodyText = await res.text();
  return { ok: res.ok, debug: res.ok ? "sent" : `resend error ${res.status}: ${bodyText}` };
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: dueReminders, error } = await supabase
    .from("reminders")
    .select(
      "id, user_id, task_id, status, method, remind_at, snoozed_until, tasks(title, description, due_date, due_time)"
    )
    .or(
      `and(status.eq.pending,remind_at.lte.${now}),and(status.eq.snoozed,snoozed_until.lte.${now})`
    );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const debugInfo: string[] = [];

  for (const reminder of dueReminders ?? []) {
    const task = (reminder as unknown as { tasks: TaskInfo | null }).tasks ?? {
      title: "Task reminder",
      description: null,
      due_date: null,
      due_time: null,
    };

    let ok: boolean;
    if (reminder.method === "email") {
      const result = await sendEmail(reminder.user_id, task);
      ok = result.ok;
      debugInfo.push(result.debug);
    } else {
      ok = (await sendBrowserPush(reminder.user_id, task.title)) > 0;
    }

    if (ok) {
      sent++;
      await supabase.from("reminders").update({ status: "sent" }).eq("id", reminder.id);
    } else {
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ processed: dueReminders?.length ?? 0, sent, failed, debugInfo }),
    { headers: { "Content-Type": "application/json" } }
  );
});
