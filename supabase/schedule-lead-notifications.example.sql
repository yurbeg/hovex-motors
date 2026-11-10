-- Run this example manually in the Supabase SQL Editor after deploying the
-- `process-lead-notifications` Edge Function and configuring its Telegram
-- secrets. Replace placeholders locally; never commit a project URL, secret
-- key, Telegram bot token, or chat identifier here.
--
-- The Edge Function has verify_jwt=false so pg_net can invoke it, but it still
-- authenticates the `apikey` header against its injected Supabase secret keys
-- before it claims any notification job or contacts Telegram.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Run these Vault calls once. To rotate an existing value, use
-- vault.update_secret with its id instead of creating the same name again.
select vault.create_secret(
  'https://REPLACE_WITH_PROJECT_REF.supabase.co',
  'lead_notifications_project_url',
  'Supabase project URL used by the lead notification schedule'
);

select vault.create_secret(
  'REPLACE_WITH_PROJECT_SECRET_KEY',
  'lead_notifications_project_key',
  'Server-only Supabase key used to authenticate the notification worker'
);

-- Re-running only this scheduling block replaces the named schedule instead
-- of creating duplicate jobs. A one-minute interval bounds normal delivery
-- latency while the durable outbox preserves jobs during provider outages.
select cron.unschedule(jobid)
from cron.job
where jobname = 'process-lead-notifications-every-minute';

-- Stop here on first setup and inspect these durable delivery summaries before
-- separately executing the scheduling block below. They expose no customer
-- contact data or keys. Jobs accumulated since the migration will be drained
-- when the schedule is enabled.
select
  status,
  count(*) as job_count,
  min(created_at) as oldest_job_at
from app_private.lead_notification_outbox
group by status
order by status;

select
  lead_id,
  status,
  attempt_count,
  available_at,
  last_error_code,
  last_safe_error,
  updated_at
from app_private.lead_notification_outbox
where status in ('pending', 'processing', 'retry', 'dead')
order by created_at
limit 50;

-- After reviewing the summaries above, execute this block separately to
-- enable one-minute delivery.
select cron.schedule(
  'process-lead-notifications-every-minute',
  '* * * * *',
  $schedule$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'lead_notifications_project_url'
        limit 1
      ) || '/functions/v1/process-lead-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'lead_notifications_project_key'
          limit 1
        )
      ),
      body := '{}'::jsonb,
      -- Defaults allow a 98-second worst-case worker envelope; keep the HTTP
      -- request alive beyond that while the database lease remains 120s.
      timeout_milliseconds := 120000
    );
  $schedule$
);

-- Inspect recent Cron invocations without revealing request headers.
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
  where jobname = 'process-lead-notifications-every-minute'
  limit 1
)
order by start_time desc
limit 20;
