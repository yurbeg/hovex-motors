-- Run this once in the Supabase SQL Editor after creating and confirming the
-- admin user under Authentication > Users. Never run it from the browser.
--
-- Replace the placeholder below before executing this file.

begin;

do $bootstrap$
declare
  admin_email constant text := 'REPLACE_WITH_CONFIRMED_ADMIN_EMAIL@example.com';
  admin_user_id uuid;
begin
  if admin_email like 'REPLACE_WITH_%' then
    raise exception 'Replace the admin email placeholder before running bootstrap';
  end if;

  begin
    select users.id
    into strict admin_user_id
    from auth.users as users
    where lower(users.email) = lower(admin_email)
      and users.email_confirmed_at is not null;
  exception
    when no_data_found then
      raise exception 'No confirmed Supabase Auth user found for email %', admin_email;
    when too_many_rows then
      raise exception 'More than one confirmed Supabase Auth user found for email %', admin_email;
  end;

  insert into public.admin_users (user_id, singleton, granted_at)
  values (admin_user_id, true, now())
  on conflict (singleton) do update
  set
    user_id = excluded.user_id,
    granted_at = excluded.granted_at;
end;
$bootstrap$;

commit;
