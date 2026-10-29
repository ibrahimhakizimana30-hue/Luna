-- Luna : schéma de la base de données (Supabase / PostgreSQL)
--
-- À exécuter une fois dans l'éditeur SQL de Supabase.
-- Toutes les règles sensibles (solde, frais, limites, PIN, KYC) sont
-- appliquées ici, côté serveur : l'application ne peut pas les contourner.

create extension if not exists pgcrypto with schema extensions;

-- Schéma privé : jamais exposé à l'application.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  contact text not null unique,
  plan text not null default 'free' check (plan in ('free', 'premium', 'vip')),
  kyc_status text not null default 'none'
    check (kyc_status in ('none', 'pending', 'approved', 'rejected')),
  trial_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0), -- en FCFA
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id),
  recipient_id uuid not null references public.profiles (id),
  amount bigint not null check (amount > 0), -- en FCFA
  fee bigint not null default 0 check (fee >= 0),
  status text not null default 'completed' check (status in ('completed')),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index transactions_sender_idx on public.transactions (sender_id, created_at desc);
create index transactions_recipient_idx on public.transactions (recipient_id, created_at desc);

create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc_type text not null check (doc_type in ('id-card', 'niu-card', 'driver-license', 'passport')),
  recto_path text not null,
  verso_path text,
  selfie_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- PIN haché (bcrypt) et compteur d'essais : illisibles par l'application.
create table private.pins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz
);

-- ---------------------------------------------------------------------------
-- Création automatique du profil et du portefeuille à l'inscription
-- ---------------------------------------------------------------------------

-- Crédit fictif offert à chaque nouveau compte pour tester les transferts.
-- Mettre 0 avant d'utiliser de l'argent réel.
create or replace function private.test_credit() returns bigint
language sql immutable as $$ select 50000::bigint $$;

-- Met un contact sous une forme unique : email en minuscules, ou numéro
-- « +242XXXXXXXXX » (Supabase stocke les numéros sans le « + »).
-- Un numéro local à 9 chiffres (ex. 06 123 4567) reçoit l'indicatif +242.
create or replace function private.normalize_contact(p_contact text) returns text
language plpgsql immutable as $$
declare
  v_digits text;
begin
  if p_contact is null then
    return null;
  end if;
  if position('@' in p_contact) > 0 then
    return lower(trim(p_contact));
  end if;
  v_digits := regexp_replace(p_contact, '[^0-9]', '', 'g');
  if length(v_digits) = 9 then
    v_digits := '242' || v_digits;
  end if;
  return '+' || v_digits;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, contact)
  values (
    new.id,
    coalesce(
      private.normalize_contact(nullif(new.email, '')),
      private.normalize_contact(nullif(new.phone, '')),
      new.id::text
    )
  );

  insert into public.wallets (user_id, balance)
  values (new.id, private.test_credit());

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Sécurité ligne par ligne : chacun ne voit que ses propres données
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.kyc_submissions enable row level security;

create policy "Lire son profil" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "Lire son portefeuille" on public.wallets
  for select to authenticated using (user_id = auth.uid());

create policy "Lire ses transactions" on public.transactions
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "Lire ses demandes KYC" on public.kyc_submissions
  for select to authenticated using (user_id = auth.uid());

-- Aucune écriture directe : tout passe par les fonctions ci-dessous.
revoke insert, update, delete on public.profiles, public.wallets,
  public.transactions, public.kyc_submissions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Code PIN
-- ---------------------------------------------------------------------------

create or replace function public.has_pin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (select 1 from private.pins where user_id = auth.uid());
$$;

create or replace function public.set_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'Le code PIN doit contenir 4 chiffres';
  end if;

  -- Remplacer un PIN existant exige une connexion par code (SMS/email)
  -- de moins de 15 minutes : un téléphone volé et déjà connecté ne suffit pas.
  if exists (select 1 from private.pins where user_id = auth.uid())
     and coalesce((
       select max((e ->> 'timestamp')::bigint)
       from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) e
       where e ->> 'method' = 'otp'
     ), 0) < extract(epoch from now())::bigint - 900 then
    raise exception 'Reconnectez-vous avec un code de vérification pour changer de PIN';
  end if;

  insert into private.pins (user_id, pin_hash)
  values (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null;
end;
$$;

-- Renvoie { ok, attempts_left, locked_until }.
-- Tous les 5 échecs : blocage de 30 s, puis 1 min, 2 min… (max 1 h).
-- Ne lève pas d'erreur en cas d'échec, pour que le compteur soit bien enregistré.
create or replace function private.check_pin(p_user_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pin private.pins%rowtype;
  v_round int;
begin
  select * into v_pin from private.pins where user_id = p_user_id for update;
  if not found then
    raise exception 'Aucun code PIN défini';
  end if;

  if v_pin.locked_until is not null and v_pin.locked_until > now() then
    return jsonb_build_object('ok', false, 'attempts_left', 0, 'locked_until', v_pin.locked_until);
  end if;

  if v_pin.pin_hash = extensions.crypt(coalesce(p_pin, ''), v_pin.pin_hash) then
    update private.pins set failed_attempts = 0, locked_until = null where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'attempts_left', 5, 'locked_until', null);
  end if;

  v_pin.failed_attempts := v_pin.failed_attempts + 1;
  if v_pin.failed_attempts % 5 = 0 then
    v_round := v_pin.failed_attempts / 5 - 1;
    v_pin.locked_until := now() + least(interval '30 seconds' * power(2, v_round), interval '1 hour');
  end if;

  update private.pins
    set failed_attempts = v_pin.failed_attempts, locked_until = v_pin.locked_until
    where user_id = p_user_id;

  return jsonb_build_object(
    'ok', false,
    'attempts_left', 5 - (v_pin.failed_attempts % 5),
    'locked_until', case when v_pin.locked_until > now() then v_pin.locked_until end
  );
end;
$$;

create or replace function public.verify_pin(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  return private.check_pin(auth.uid(), p_pin);
end;
$$;

-- ---------------------------------------------------------------------------
-- Transferts entre utilisateurs Luna
-- ---------------------------------------------------------------------------

create or replace function private.plan_fee_percent(p_plan text) returns numeric
language sql immutable as $$
  select case p_plan when 'vip' then 0.5 when 'premium' then 1.5 else 2.5 end
$$;

create or replace function private.plan_monthly_limit(p_plan text) returns bigint
language sql immutable as $$
  select case p_plan when 'vip' then null when 'premium' then 500000 else 50000 end
$$;

-- Renvoie { ok: true, transaction } ou { ok: false, pin: { attempts_left, locked_until } }
-- si le code PIN est faux. Les autres refus lèvent une erreur explicite.
create or replace function public.transfer(p_recipient_contact text, p_amount bigint, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender public.profiles%rowtype;
  v_recipient_id uuid;
  v_fee bigint;
  v_limit bigint;
  v_sent_this_month bigint;
  v_balance bigint;
  v_tx public.transactions%rowtype;
  v_pin_check jsonb;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;

  -- Chaque transfert exige le code PIN, vérifié ici
  v_pin_check := private.check_pin(auth.uid(), p_pin);
  if not (v_pin_check ->> 'ok')::boolean then
    return jsonb_build_object('ok', false, 'pin', v_pin_check);
  end if;

  if p_amount is null or p_amount < 100 then
    raise exception 'Le montant minimum est de 100 FCFA';
  end if;

  select * into v_sender from public.profiles where id = auth.uid();

  -- Pendant l'essai de 7 jours ou après validation KYC uniquement
  if v_sender.kyc_status <> 'approved'
     and v_sender.trial_started_at < now() - interval '7 days' then
    raise exception 'Période d''essai terminée : vérification KYC requise';
  end if;

  select id into v_recipient_id
    from public.profiles
    where contact = private.normalize_contact(p_recipient_contact);
  if v_recipient_id is null then
    raise exception 'Aucun utilisateur Luna avec ce contact';
  end if;
  if v_recipient_id = v_sender.id then
    raise exception 'Vous ne pouvez pas vous envoyer de l''argent';
  end if;

  v_fee := ceil(p_amount * private.plan_fee_percent(v_sender.plan) / 100);

  -- Verrouille les deux portefeuilles dans un ordre fixe (évite les blocages)
  perform 1 from public.wallets
    where user_id in (v_sender.id, v_recipient_id)
    order by user_id
    for update;

  v_limit := private.plan_monthly_limit(v_sender.plan);
  if v_limit is not null then
    select coalesce(sum(amount), 0) into v_sent_this_month
      from public.transactions
      where sender_id = v_sender.id
        and created_at >= date_trunc('month', now());
    if v_sent_this_month + p_amount > v_limit then
      raise exception 'Limite mensuelle de % FCFA atteinte pour votre plan', v_limit;
    end if;
  end if;

  select balance into v_balance from public.wallets where user_id = v_sender.id;
  if v_balance < p_amount + v_fee then
    raise exception 'Solde insuffisant (montant + frais : % FCFA)', p_amount + v_fee;
  end if;

  update public.wallets set balance = balance - (p_amount + v_fee), updated_at = now()
    where user_id = v_sender.id;
  update public.wallets set balance = balance + p_amount, updated_at = now()
    where user_id = v_recipient_id;

  insert into public.transactions (sender_id, recipient_id, amount, fee)
    values (v_sender.id, v_recipient_id, p_amount, v_fee)
    returning * into v_tx;

  return jsonb_build_object('ok', true, 'transaction', to_jsonb(v_tx));
end;
$$;

-- Historique avec le contact de l'autre personne (sans exposer les autres profils)
create or replace function public.my_transactions(p_limit int default 50)
returns table (
  id uuid,
  direction text,
  counterpart text,
  amount bigint,
  fee bigint,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select t.id,
         case when t.sender_id = auth.uid() then 'send' else 'receive' end,
         p.contact,
         t.amount,
         case when t.sender_id = auth.uid() then t.fee else 0 end,
         t.status,
         t.created_at
  from public.transactions t
  join public.profiles p
    on p.id = case when t.sender_id = auth.uid() then t.recipient_id else t.sender_id end
  where t.sender_id = auth.uid() or t.recipient_id = auth.uid()
  order by t.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

-- ---------------------------------------------------------------------------
-- Vérification d'identité (KYC)
-- ---------------------------------------------------------------------------

create or replace function public.submit_kyc(
  p_doc_type text,
  p_recto_path text,
  p_verso_path text,
  p_selfie_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text := auth.uid()::text || '/';
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  -- Les fichiers doivent être dans le dossier de l'utilisateur
  if left(p_recto_path, length(v_prefix)) <> v_prefix
     or left(p_selfie_path, length(v_prefix)) <> v_prefix
     or (p_verso_path is not null and left(p_verso_path, length(v_prefix)) <> v_prefix) then
    raise exception 'Fichiers invalides';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and kyc_status = 'approved') then
    raise exception 'Identité déjà vérifiée';
  end if;

  insert into public.kyc_submissions (user_id, doc_type, recto_path, verso_path, selfie_path)
    values (auth.uid(), p_doc_type, p_recto_path, p_verso_path, p_selfie_path);

  update public.profiles set kyc_status = 'pending' where id = auth.uid();
end;
$$;

-- Pour l'administrateur (éditeur SQL de Supabase uniquement) :
--   select private.review_kyc('<id de la demande>', true);   -- approuver
--   select private.review_kyc('<id de la demande>', false);  -- refuser
create or replace function private.review_kyc(p_submission_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  update public.kyc_submissions
    set status = case when p_approve then 'approved' else 'rejected' end
    where id = p_submission_id
    returning user_id into v_user_id;
  if v_user_id is null then
    raise exception 'Demande introuvable';
  end if;
  update public.profiles
    set kyc_status = case when p_approve then 'approved' else 'rejected' end
    where id = v_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.has_pin(), public.set_pin(text), public.verify_pin(text),
  public.transfer(text, bigint, text), public.my_transactions(int),
  public.submit_kyc(text, text, text, text) from public, anon;
grant execute on function public.has_pin(), public.set_pin(text), public.verify_pin(text),
  public.transfer(text, bigint, text), public.my_transactions(int),
  public.submit_kyc(text, text, text, text) to authenticated;
