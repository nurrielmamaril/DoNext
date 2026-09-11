"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Records the browser's timezone on the signed-in profile.
 *
 * A task's due_date and due_time are wall-clock values with no zone attached,
 * so the cron that fires desktop notifications has no way to know whether
 * "9:00 AM" means Manila or New York. This is where it finds out: whatever
 * clock this machine is on is the clock those times belong to. Writes only
 * when the value actually changes, so it costs one read per session.
 */
export function TimezoneSync() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;

    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const id = userData.user?.id;
      if (!id || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", id)
        .single();
      if (cancelled || profile?.timezone === timezone) return;

      await supabase.from("profiles").update({ timezone }).eq("id", id);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
