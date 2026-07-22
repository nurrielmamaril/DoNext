// Runs on a schedule (see supabase/migrations for the pg_cron job that calls
// this). Finds scheduled_emails rows that have come due and sends each one
// to its arbitrary recipient, marking it sent or failed. Deployed with
// --no-verify-jwt like send-due-reminders — the only caller is our own
// cron job, gated by the same shared x-cron-secret header.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildItemEmailContent, sendViaResend } from "../_shared/itemEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "DoNext <onboarding@resend.dev>";
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Email sending isn't configured" }), { status: 500 });
  }

  const now = new Date().toISOString();

  const { data: dueEmails, error } = await supabase
    .from("scheduled_emails")
    .select("id, item_type, item_id, recipient_email, subject, send_at")
    .eq("status", "pending")
    .lte("send_at", now);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const debugInfo: string[] = [];

  for (const row of dueEmails ?? []) {
    const content = await buildItemEmailContent(
      supabase,
      row.item_type as "task" | "note",
      row.item_id,
      row.subject ?? undefined
    );

    if ("error" in content) {
      failed++;
      debugInfo.push(content.error);
      await supabase.from("scheduled_emails").update({ status: "failed" }).eq("id", row.id);
      continue;
    }

    const result = await sendViaResend(row.recipient_email, content.subject, content.html, RESEND_API_KEY, RESEND_FROM);
    if (result.ok) {
      sent++;
      await supabase.from("scheduled_emails").update({ status: "sent" }).eq("id", row.id);
    } else {
      failed++;
      debugInfo.push(result.error ?? "unknown error");
      await supabase.from("scheduled_emails").update({ status: "failed" }).eq("id", row.id);
    }
  }

  return new Response(
    JSON.stringify({ processed: dueEmails?.length ?? 0, sent, failed, debugInfo }),
    { headers: { "Content-Type": "application/json" } }
  );
});
