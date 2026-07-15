-- Schedules the send-due-reminders Edge Function to run every minute.
--
-- Authenticates with a shared secret known only to this function (see
-- CRON_SECRET in its Supabase secrets), stored here in Supabase Vault
-- (encrypted) rather than as plain text, since the caller here is a
-- scheduled job, not a logged-in user.
--
-- Before running this file, first store the secret in Vault by running
-- (once, in the SQL Editor, not saved anywhere in this project):
--   select vault.create_secret('<YOUR_CRON_SECRET>', 'cron_secret');
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-due-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://axwelcndmvqmccelzpuo.supabase.co/functions/v1/send-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
