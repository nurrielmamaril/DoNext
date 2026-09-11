// Runs on a schedule (see supabase/migrations for the pg_cron job that calls
// this). Finds reminders that just came due and delivers each one via its
// chosen method (browser push or email), then marks it as sent.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import {
  addDays,
  addWeeks,
  addMonths,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "npm:date-fns@4.4.0";

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
// due_date and due_time are wall-clock values with no zone attached. The app
// records the browser's own zone on the profile (see TimezoneSync); this is
// only the fallback for a profile that has not reported one yet. Without it a
// task due "9:00 AM" would fire at 9am UTC.
const FALLBACK_TZ = Deno.env.get("REMINDER_TIMEZONE") ?? "America/New_York";
// A task with a due date but no due time is treated as due at this hour.
const DEFAULT_DUE_TIME = Deno.env.get("DEFAULT_DUE_TIME") ?? "09:00";
// How the automatic nudges are paced: first at the due time, then every
// REPEAT_MINUTES until the task is done, giving up REPEAT_WINDOW_HOURS later.
const REPEAT_MINUTES = 30;
const REPEAT_WINDOW_HOURS = 3;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type TaskInfo = {
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
};

type ReminderRecurrenceRule = { unit: "day" | "week" | "month"; interval: number };

// Duplicated from lib/utils/reminderRecurrence.ts — edge functions can't
// import from lib/, same reasoning as the duplicated HTML-detection regex.
function computeNextRemindAt(currentRemindAt: string, rule: ReminderRecurrenceRule): string {
  const current = parseISO(currentRemindAt);
  const next =
    rule.unit === "day"
      ? addDays(current, rule.interval)
      : rule.unit === "week"
        ? addWeeks(current, rule.interval)
        : addMonths(current, rule.interval);
  return next.toISOString();
}

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

/**
 * How far `timeZone` is from UTC at this instant, in milliseconds. Formatting
 * the date into the zone and reading the parts back as if they were UTC is the
 * standard way to get this without pulling in a timezone library.
 */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asIfUtc - at.getTime();
}

/** The real instant a "YYYY-MM-DD" + "HH:MM" wall time in `timeZone` lands on. */
function wallTimeToInstant(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  // Offset is evaluated at roughly the right instant, which is what matters
  // either side of a DST change.
  return new Date(naive - zoneOffsetMs(new Date(naive), timeZone));
}

/** Today's date in `timeZone`, as YYYY-MM-DD. */
function localToday(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function sendBrowserPush(
  userId: string,
  taskTitle: string,
  options: { title?: string; body?: string; tag?: string } = {}
) {
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  const payload = JSON.stringify({
    title: options.title ?? "DoNext reminder",
    body: options.body ?? taskTitle,
    url: "/dashboard",
    tag: options.tag,
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

// recipientEmail is the address this reminder was addressed to, or null for
// "send it to me", in which case the owner's own address is looked up as before.
async function sendEmail(
  userId: string,
  task: TaskInfo,
  recipientEmail: string | null
): Promise<{ ok: boolean; debug: string }> {
  if (!RESEND_API_KEY) return { ok: false, debug: "no RESEND_API_KEY configured" };

  let to = recipientEmail?.trim() || "";
  if (!to) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
    if (profileError) return { ok: false, debug: `profile lookup error: ${profileError.message}` };
    if (!profile?.email) return { ok: false, debug: "profile has no email" };
    to = profile.email;
  }

  const due = dueLabel(task);
  const subject = due ? `Reminder: ${task.title} | Due ${due}` : `Reminder: ${task.title}`;
  const htmlLines = [
    // "your task" only reads right when it is going to the owner.
    recipientEmail?.trim()
      ? `<p>A reminder was set for this task:</p>`
      : `<p>This is a reminder for your task:</p>`,
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
      to: [to],
      subject,
      html: htmlLines.join("\n"),
    }),
  });
  const bodyText = await res.text();
  return { ok: res.ok, debug: res.ok ? "sent" : `resend error ${res.status}: ${bodyText}` };
}

/**
 * Desktop notifications straight off a task's due date — no reminder row, no
 * setup. Fires when the due time arrives and nudges again every
 * REPEAT_MINUTES until the task is completed, giving up REPEAT_WINDOW_HOURS
 * after it came due so a task left open does not chime forever.
 *
 * Only the window keeps this sane: a task whose due date passed last week has
 * no due_notified_at either, and without the window every one of them would
 * fire the moment this shipped.
 */
async function notifyTasksComingDue(): Promise<{ notified: number }> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - REPEAT_MINUTES * 60_000).toISOString();

  // Bounded by the furthest-ahead zone so no one's "today" is missed; each
  // task is then judged against its own owner's clock below.
  const { data: candidates } = await supabase
    .from("tasks")
    .select("id, user_id, title, due_date, due_time, due_notified_at")
    .not("due_date", "is", null)
    .neq("status", "completed")
    .is("deleted_at", null)
    .lte("due_date", localToday("Pacific/Kiritimati"))
    .or(`due_notified_at.is.null,due_notified_at.lte.${staleBefore}`);

  if (!candidates?.length) return { notified: 0 };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, timezone")
    .in("id", [...new Set(candidates.map((t) => t.user_id))]);
  const zoneOf = new Map(profiles?.map((p) => [p.id, p.timezone || FALLBACK_TZ]) ?? []);

  let notified = 0;
  for (const task of candidates) {
    const tz = zoneOf.get(task.user_id) ?? FALLBACK_TZ;
    const dueAt = wallTimeToInstant(task.due_date!, task.due_time ?? DEFAULT_DUE_TIME, tz);
    const sinceDue = now.getTime() - dueAt.getTime();
    if (sinceDue < 0 || sinceDue > REPEAT_WINDOW_HOURS * 3_600_000) continue;

    const repeat = task.due_notified_at !== null;
    const sent = await sendBrowserPush(task.user_id, task.title, {
      title: repeat ? `Still due: ${task.title}` : task.title,
      body: task.due_time
        ? `Due at ${formatDueTime(task.due_time)}`
        : "Due today",
      // Per task, so a repeat replaces its own toast rather than stacking, and
      // two tasks due at once still get one each.
      tag: `task-${task.id}`,
    });
    if (sent > 0) notified++;

    // Stamped even when no device was reachable, so a machine that is off does
    // not queue up a burst of nudges the moment it comes back.
    await supabase
      .from("tasks")
      .update({ due_notified_at: now.toISOString() })
      .eq("id", task.id);
  }
  return { notified };
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const dueTaskResult = await notifyTasksComingDue();

  const now = new Date().toISOString();

  const { data: dueReminders, error } = await supabase
    .from("reminders")
    .select(
      "id, user_id, task_id, status, method, remind_at, snoozed_until, is_recurring, recurrence_rule, recipient_email, tasks(title, description, due_date, due_time)"
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
      const result = await sendEmail(reminder.user_id, task, reminder.recipient_email);
      ok = result.ok;
      debugInfo.push(result.debug);
    } else {
      ok = (await sendBrowserPush(reminder.user_id, task.title)) > 0;
    }

    if (ok) {
      sent++;
      if (reminder.is_recurring && reminder.recurrence_rule) {
        const nextRemindAt = computeNextRemindAt(
          reminder.remind_at,
          reminder.recurrence_rule as ReminderRecurrenceRule
        );
        await supabase
          .from("reminders")
          .update({ remind_at: nextRemindAt, status: "pending", snoozed_until: null })
          .eq("id", reminder.id);
      } else {
        await supabase.from("reminders").update({ status: "sent" }).eq("id", reminder.id);
      }
    } else {
      failed++;
    }
  }

  return new Response(
    JSON.stringify({
      processed: dueReminders?.length ?? 0,
      sent,
      failed,
      dueTasksNotified: dueTaskResult.notified,
      debugInfo,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
