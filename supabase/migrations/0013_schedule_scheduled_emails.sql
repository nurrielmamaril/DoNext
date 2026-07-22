-- Schedules the send-scheduled-emails function to run every minute, mirroring
-- 0009_schedule_reminders.sql exactly (same cadence, same cron_secret Vault
-- entry — no new secret needed). pg_cron/pg_net extensions are already
-- created by 0009.
select cron.schedule(
  'send-scheduled-emails-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://axwelcndmvqmccelzpuo.supabase.co/functions/v1/send-scheduled-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
