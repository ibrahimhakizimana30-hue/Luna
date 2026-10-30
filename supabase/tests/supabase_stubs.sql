-- Imitation minimale de l'environnement Supabase
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role supabase_auth_admin nologin; exception when duplicate_object then null; end $$;
create schema auth; create schema extensions; create schema storage;
grant usage on schema public, auth, extensions to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
grant select on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant execute on function auth.jwt() to anon, authenticated;
-- Notifications : imitations de pg_net, du coffre-fort Vault et du rôle de service
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create schema if not exists net;
create table net.requests (id bigserial primary key, url text, body jsonb, headers jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
  returns bigint language sql as $$ insert into net.requests (url, body, headers) values (url, body, headers) returning id $$;
create schema if not exists vault;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
insert into vault.decrypted_secrets values ('luna_push_secret', 'secret-de-test'), ('luna_vapid_public', 'pub'), ('luna_vapid_private', 'priv');
