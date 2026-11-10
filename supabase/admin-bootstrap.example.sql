-- Run this once in the Supabase SQL Editor after creating and confirming the
-- admin user under Authentication > Users. Never run it from the browser.
--
-- Replace the placeholder below before executing this file.

begin;

do $bootstrap$
declare
  admin_email constant text := 'REPLACE_WITH_CONFIRMED_ADMIN_EMAIL@example.com';
  admin_user_id uuid;
  previous_admin_user_id uuid;
  confirmed_admin_email text;
  admin_display_name text;
begin
  if admin_email like 'REPLACE_WITH_%' then
    raise exception 'Replace the admin email placeholder before running bootstrap';
  end if;

  begin
    select
      users.id,
      users.email,
      left(
        coalesce(
          case
            when char_length(btrim(users.raw_user_meta_data ->> 'full_name')) >= 2
              then btrim(users.raw_user_meta_data ->> 'full_name')
            else null
          end,
          nullif(btrim(users.email), ''),
          'Hovex admin'
        ),
        120
      )
    into strict admin_user_id, confirmed_admin_email, admin_display_name
    from auth.users as users
    where lower(users.email) = lower(admin_email)
      and users.email_confirmed_at is not null;
  exception
    when no_data_found then
      raise exception 'No confirmed Supabase Auth user found for email %', admin_email;
    when too_many_rows then
      raise exception 'More than one confirmed Supabase Auth user found for email %', admin_email;
  end;

  select admins.user_id
  into previous_admin_user_id
  from public.admin_users as admins
  where admins.singleton;

  insert into public.admin_users (user_id, singleton, granted_at)
  values (admin_user_id, true, now())
  on conflict (singleton) do update
  set
    user_id = excluded.user_id,
    granted_at = excluded.granted_at;

  -- The manager table is introduced by the lead workflow migration. Dynamic
  -- SQL keeps this bootstrap backward-compatible if it is run before that
  -- migration; the migration will seed the current admin later.
  if to_regclass('public.lead_managers') is not null then
    if previous_admin_user_id is not null
      and previous_admin_user_id <> admin_user_id
    then
      execute
        'update public.lead_managers set is_active = false where auth_user_id = $1'
      using previous_admin_user_id;
    end if;

    execute $manager$
      insert into public.lead_managers (
        auth_user_id,
        display_name,
        email,
        is_active
      )
      values ($1, $2, $3, true)
      on conflict (auth_user_id) do update
      set
        display_name = excluded.display_name,
        email = excluded.email,
        is_active = true
    $manager$
    using admin_user_id, admin_display_name, confirmed_admin_email;
  end if;
end;
$bootstrap$;

commit;
