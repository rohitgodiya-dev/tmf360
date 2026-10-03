-- Part 1d — sign-up tokens
--
-- signup_tokens had "anyone can read" and "anyone can update" policies: anyone,
-- without logging in, could list every unused sign-up link and edit tokens.
-- Now:
--   * only platform admins (admin_users) can list and update tokens
--   * the public sign-up page checks one token it already holds, and marks it
--     used, through two narrow functions; nobody can enumerate tokens

drop policy if exists "anyone can read signup tokens" on signup_tokens;
drop policy if exists "anyone can update signup tokens" on signup_tokens;

drop policy if exists "platform admins read signup tokens" on signup_tokens;
create policy "platform admins read signup tokens" on signup_tokens for select to authenticated
  using (is_platform_admin());
drop policy if exists "platform admins update signup tokens" on signup_tokens;
create policy "platform admins update signup tokens" on signup_tokens for update to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

revoke insert, delete, truncate on signup_tokens from anon, authenticated;
revoke update on signup_tokens from anon;

-- Returns the status of one token the caller already has: valid, used or expired.
create or replace function check_signup_token(p_token text)
returns table (status text, org_name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when t.used_at is not null then 'used'
         when t.expires_at < now() then 'expired'
         else 'valid' end,
    t.org_name,
    t.email
  from signup_tokens t
  where t.token = p_token;
$$;

-- Marks a valid token used; returns false if it was already used or has expired.
create or replace function use_signup_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update signup_tokens set used_at = now()
  where token = p_token and used_at is null and expires_at > now();
  return found;
end;
$$;

grant execute on function check_signup_token(text) to anon, authenticated;
grant execute on function use_signup_token(text) to anon, authenticated;
