// Sends a task's or note's details to an arbitrary email address, on behalf
// of the signed-in user who owns it. Unlike send-due-reminders (a cron-only
// endpoint using a shared secret), this is invoked directly by a logged-in
// user from the client, so it relies on normal Supabase Auth JWT
// verification instead — deployed WITHOUT --no-verify-jwt. The Supabase
// client below is scoped to the caller's own JWT (not the service role
// key), so Row Level Security itself enforces "you can only email your own
// tasks/notes" with no extra authorization code needed.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildItemEmailContent, sendViaResend } from "../_shared/itemEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "DoNext <onboarding@resend.dev>";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

  let body: { type?: string; id?: string; to?: string; subject?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const { type, id, to, subject: customSubject } = body;
  if (type !== "task" && type !== "note") {
    return jsonResponse({ error: "type must be \"task\" or \"note\"" }, 400);
  }
  if (!id || !to || !isValidEmail(to)) {
    return jsonResponse({ error: "A valid recipient email is required" }, 400);
  }

  const content = await buildItemEmailContent(supabase, type, id, customSubject);
  if ("error" in content) {
    return jsonResponse({ error: content.error }, content.status);
  }

  const result = await sendViaResend(to, content.subject, content.html, RESEND_API_KEY, RESEND_FROM);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, result.status ?? 502);
  }

  return jsonResponse({ ok: true });
});
