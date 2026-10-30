-- Luna : notifications sur le téléphone (Web Push), même quand Luna est fermé.
--
-- Fonctionnement : un événement (message, appel, argent reçu, vérification
-- d'identité) déclenche private.notify(), qui appelle la fonction Edge
-- « send-push ». Celle-ci chiffre et envoie la notification aux téléphones
-- abonnés de la personne.
--
-- Secrets (créés à part dans le coffre-fort Vault, jamais dans le code) :
--   luna_push_secret    : mot de passe partagé entre la base et la fonction Edge
--   luna_vapid_public   : clé publique VAPID (aussi dans l'application)
--   luna_vapid_private  : clé privée VAPID

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end;
$$;

-- Téléphones / navigateurs abonnés aux notifications
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 10 and 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Choix de chaque personne
create table public.notification_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  messages boolean not null default true,
  calls boolean not null default true,
  money boolean not null default true,
  kyc boolean not null default true,
  previews boolean not null default true -- afficher le début des messages
);

alter table public.push_subscriptions enable row level security;
alter table public.notification_settings enable row level security;
create policy "Voir ses abonnements" on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);
create policy "Voir ses réglages de notification" on public.notification_settings
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.push_subscriptions, public.notification_settings from anon, authenticated;
grant select on public.push_subscriptions, public.notification_settings to authenticated;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' then
    raise exception 'Abonnement invalide';
  end if;
  if (select count(*) from public.push_subscriptions where user_id = auth.uid()) >= 10 then
    -- On garde les 9 plus récents
    delete from public.push_subscriptions where id in (
      select id from public.push_subscriptions where user_id = auth.uid()
      order by created_at desc offset 9);
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    values (auth.uid(), p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do update
      set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

create or replace function public.get_notification_settings()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.notification_settings;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  insert into public.notification_settings (user_id) values (auth.uid()) on conflict do nothing;
  select * into v from public.notification_settings where user_id = auth.uid();
  return jsonb_build_object('messages', v.messages, 'calls', v.calls, 'money', v.money,
                            'kyc', v.kyc, 'previews', v.previews);
end;
$$;

create or replace function public.set_notification_settings(
  p_messages boolean, p_calls boolean, p_money boolean, p_kyc boolean, p_previews boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  insert into public.notification_settings (user_id, messages, calls, money, kyc, previews)
    values (auth.uid(), coalesce(p_messages, true), coalesce(p_calls, true), coalesce(p_money, true),
            coalesce(p_kyc, true), coalesce(p_previews, true))
    on conflict (user_id) do update
      set messages = excluded.messages, calls = excluded.calls, money = excluded.money,
          kyc = excluded.kyc, previews = excluded.previews;
end;
$$;

-- Configuration lue par la fonction Edge (clé de service uniquement)
create or replace function public.push_config()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'push_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'luna_push_secret'),
    'vapid_public', (select decrypted_secret from vault.decrypted_secrets where name = 'luna_vapid_public'),
    'vapid_private', (select decrypted_secret from vault.decrypted_secrets where name = 'luna_vapid_private')
  );
$$;
revoke execute on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;

-- Envoie une notification à une personne, si elle l'accepte et a un téléphone abonné.
-- Ne bloque jamais l'opération d'origine (message, transfert…) en cas de problème.
create or replace function private.notify(
  p_user uuid, p_category text, p_title text, p_body text, p_url text, p_tag text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_secret text;
begin
  if not exists (select 1 from public.push_subscriptions where user_id = p_user) then
    return;
  end if;
  select case p_category
           when 'messages' then s.messages when 'calls' then s.calls
           when 'money' then s.money when 'kyc' then s.kyc else true end
    into v_enabled
    from public.notification_settings s where s.user_id = p_user;
  if v_enabled is false then
    return;
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'luna_push_secret';
  if v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://bxplshpzjlkcxojqewtp.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('user_id', p_user, 'title', p_title, 'body', p_body,
                               'url', p_url, 'tag', p_tag, 'category', p_category),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-luna-secret', v_secret)
  );
exception when others then
  raise warning 'Notification non envoyée : %', sqlerrm;
end;
$$;

create or replace function private.previews_on(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select previews from public.notification_settings where user_id = p_user), true);
$$;

-- Nouveau message
create or replace function private.on_message_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from text := (select contact from public.profiles where id = new.sender_id);
begin
  perform private.notify(
    new.recipient_id, 'messages',
    'Message de ' || v_from,
    case when private.previews_on(new.recipient_id) then left(new.body, 120) else 'Nouveau message sur Luna' end,
    '/?tab=messages', 'msg-' || new.sender_id);
  return new;
end;
$$;
create trigger luna_notify_message after insert on public.messages
  for each row execute function private.on_message_notify();

-- Appel entrant
create or replace function private.on_call_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from text := (select contact from public.profiles where id = new.caller_id);
begin
  perform private.notify(
    new.callee_id, 'calls',
    case when new.kind = 'video' then 'Appel vidéo entrant' else 'Appel entrant' end,
    v_from || ' vous appelle sur Luna. Ouvrez Luna pour répondre.',
    '/?tab=calls', 'call-' || new.id);
  return new;
end;
$$;
create trigger luna_notify_call after insert on public.calls
  for each row execute function private.on_call_notify();

-- Argent reçu
create or replace function private.on_transfer_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from text := (select contact from public.profiles where id = new.sender_id);
begin
  perform private.notify(
    new.recipient_id, 'money',
    'Argent reçu',
    replace(to_char(new.amount, 'FM999G999G999'), ',', ' ') || ' FCFA reçus de ' || v_from,
    '/?tab=transactions', 'tx-' || new.id);
  return new;
end;
$$;
create trigger luna_notify_transfer after insert on public.transactions
  for each row execute function private.on_transfer_notify();

-- Résultat de la vérification d'identité
create or replace function private.on_kyc_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kyc_status is distinct from old.kyc_status and new.kyc_status in ('approved', 'rejected') then
    perform private.notify(
      new.id, 'kyc',
      case when new.kyc_status = 'approved' then 'Identité vérifiée ✅' else 'Vérification refusée' end,
      case when new.kyc_status = 'approved'
           then 'Votre identité est vérifiée : vous pouvez utiliser Luna sans limite de durée.'
           else 'Vos documents n''ont pas pu être validés. Ouvrez Luna pour en envoyer de nouveaux.' end,
      '/', 'kyc');
  end if;
  return new;
end;
$$;
create trigger luna_notify_kyc after update of kyc_status on public.profiles
  for each row execute function private.on_kyc_notify();

-- Droits d'exécution
revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.save_push_subscription(text, text, text), public.delete_push_subscription(text),
  public.get_notification_settings(), public.set_notification_settings(boolean, boolean, boolean, boolean, boolean)
  from public, anon;
grant execute on function public.save_push_subscription(text, text, text), public.delete_push_subscription(text),
  public.get_notification_settings(), public.set_notification_settings(boolean, boolean, boolean, boolean, boolean)
  to authenticated;
