-- Run this example manually in the Supabase SQL Editor after deploying the
-- `motorapis-sync` AuctionsAPI Edge Function. The function, Vault, and cron
-- identifiers retain their legacy names for deployment compatibility. Replace
-- placeholders locally; never commit a project URL or project key here.
--
-- The Edge Function has `verify_jwt = false` so pg_net can call it, but the
-- function must still compare the `apikey` header with its server-side
-- Supabase secret key before doing any work (legacy projects may expose the
-- equivalent SUPABASE_SERVICE_ROLE_KEY name).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Run this Vault block once. Use the project's server-only secret key for
-- `motorapis_project_key`; it is read only inside the database and sent in the
-- `apikey` header. Do not use a browser publishable key for the sync endpoint.
-- To rotate an existing value, use vault.update_secret with its id instead of
-- calling vault.create_secret again with the same unique name.
select vault.create_secret(
  'https://REPLACE_WITH_PROJECT_REF.supabase.co',
  'motorapis_project_url',
  'Supabase project URL used by the AuctionsAPI sync schedule'
);

select vault.create_secret(
  'REPLACE_WITH_PROJECT_SECRET_KEY',
  'motorapis_project_key',
  'Server-only Supabase key used to authenticate the AuctionsAPI sync schedule'
);

-- Re-running only the scheduling block below replaces the named schedule
-- without creating a duplicate hourly job. Do not repeat the one-time Vault
-- create_secret calls above for an existing name.
select cron.unschedule(jobid)
from cron.job
where jobname = 'motorapis-hourly';

select cron.schedule(
  'motorapis-hourly',
  '0 * * * *',
  $schedule$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'motorapis_project_url'
        limit 1
      ) || '/functions/v1/motorapis-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'motorapis_project_key'
          limit 1
        )
      ),
      body := jsonb_build_object('mode', 'incremental'),
      timeout_milliseconds := 120000
    );
  $schedule$
);

-- Inspect recent invocations without revealing request headers.
select
  jobid,
  status,
  return_message,
  start_time,
  end_time
from cron.job_run_details
where jobid = (
  select jobid
  from cron.job
  where jobname = 'motorapis-hourly'
  limit 1
)
order by start_time desc
limit 20;
