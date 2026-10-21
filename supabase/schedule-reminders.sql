-- First set Vault secrets in Supabase Dashboard > Vault:
-- project_url, publishable_key, warranty_cron_secret
-- Set CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL for the Edge Function.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
select cron.unschedule(jobid) from cron.job where jobname = 'warranty-vault-reminders';
select cron.schedule(
  'warranty-vault-reminders',
  '0 9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-warranty-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'warranty_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
