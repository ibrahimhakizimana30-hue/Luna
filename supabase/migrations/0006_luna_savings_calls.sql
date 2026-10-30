-- Luna : compte d'épargne réel (avec le solde Luna) et appels audio / vidéo.

-- ===========================================================================
-- Épargne
-- ===========================================================================

create table public.savings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0), -- en FCFA
  goal_name text check (goal_name is null or char_length(goal_name) between 1 and 60),
  goal_amount bigint check (goal_amount is null or goal_amount > 0),
  locked_until timestamptz,
  -- Épargne automatique : montant versé chaque semaine, le jour choisi (1 = lundi … 7 = dimanche)
  auto_amount bigint check (auto_amount is null or auto_amount between 100 and 1000000),
  auto_day smallint check (auto_day is null or auto_day between 1 and 7),
  last_auto_at date,
  updated_at timestamptz not null default now()
);

create table public.savings_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'withdraw', 'auto')),
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index savings_movements_user_idx on public.savings_movements (user_id, created_at desc);

alter table public.savings enable row level security;
alter table public.savings_movements enable row level security;
create policy "Lire son épargne" on public.savings
  for select to authenticated using (auth.uid() = user_id);
create policy "Lire ses mouvements d'épargne" on public.savings_movements
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.savings, public.savings_movements from anon, authenticated;
grant select on public.savings, public.savings_movements to authenticated;

-- Crée la ligne d'épargne si besoin et la verrouille pour la suite de l'opération
create or replace function private.savings_row(p_user uuid)
returns public.savings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.savings;
begin
  insert into public.savings (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into v_row from public.savings where user_id = p_user for update;
  return v_row;
end;
$$;

create or replace function public.savings_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.savings;
  v_wallet bigint;
  v_month bigint;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  v_row := private.savings_row(auth.uid());
  select balance into v_wallet from public.wallets where user_id = auth.uid();
  select coalesce(sum(case when kind = 'withdraw' then -amount else amount end), 0) into v_month
    from public.savings_movements
    where user_id = auth.uid() and created_at >= date_trunc('month', now());
  return jsonb_build_object(
    'balance', v_row.balance,
    'wallet_balance', coalesce(v_wallet, 0),
    'goal_name', v_row.goal_name,
    'goal_amount', v_row.goal_amount,
    'locked_until', case when v_row.locked_until > now() then v_row.locked_until end,
    'auto_amount', v_row.auto_amount,
    'auto_day', v_row.auto_day,
    'month_change', v_month
  );
end;
$$;

-- Verser de l'argent du solde Luna vers l'épargne
create or replace function public.savings_deposit(p_amount bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet bigint;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_amount is null or p_amount < 100 then
    raise exception 'Le montant minimum est de 100 FCFA';
  end if;
  perform private.savings_row(auth.uid());
  select balance into v_wallet from public.wallets where user_id = auth.uid() for update;
  if coalesce(v_wallet, 0) < p_amount then
    raise exception 'Solde Luna insuffisant';
  end if;
  update public.wallets set balance = balance - p_amount, updated_at = now() where user_id = auth.uid();
  update public.savings set balance = balance + p_amount, updated_at = now() where user_id = auth.uid();
  insert into public.savings_movements (user_id, kind, amount) values (auth.uid(), 'deposit', p_amount);
end;
$$;

-- Retirer de l'argent de l'épargne vers le solde Luna (impossible si l'épargne est bloquée)
create or replace function public.savings_withdraw(p_amount bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.savings;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'Montant invalide';
  end if;
  v_row := private.savings_row(auth.uid());
  if v_row.locked_until > now() then
    raise exception 'Épargne bloquée jusqu''au %', to_char(v_row.locked_until at time zone 'Africa/Brazzaville', 'DD/MM/YYYY');
  end if;
  if v_row.balance < p_amount then
    raise exception 'Épargne insuffisante';
  end if;
  update public.savings set balance = balance - p_amount, updated_at = now() where user_id = auth.uid();
  update public.wallets set balance = balance + p_amount, updated_at = now() where user_id = auth.uid();
  insert into public.savings_movements (user_id, kind, amount) values (auth.uid(), 'withdraw', p_amount);
end;
$$;

-- Objectif d'épargne (nom et montant), ou aucun objectif si p_name est vide
create or replace function public.savings_set_goal(p_name text, p_amount bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if v_name is not null and (p_amount is null or p_amount < 100) then
    raise exception 'L''objectif doit être d''au moins 100 FCFA';
  end if;
  if char_length(v_name) > 60 then
    raise exception 'Nom de l''objectif trop long (60 caractères au maximum)';
  end if;
  perform private.savings_row(auth.uid());
  update public.savings
    set goal_name = v_name, goal_amount = case when v_name is null then null else p_amount end, updated_at = now()
    where user_id = auth.uid();
end;
$$;

-- Bloquer l'épargne pendant N jours. Un blocage ne peut être que prolongé, jamais raccourci.
create or replace function public.savings_lock(p_days int)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.savings;
  v_until timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'Durée de blocage : entre 1 et 365 jours';
  end if;
  v_row := private.savings_row(auth.uid());
  v_until := greatest(coalesce(v_row.locked_until, now()), now()) + make_interval(days => p_days);
  update public.savings set locked_until = v_until, updated_at = now() where user_id = auth.uid();
  return v_until;
end;
$$;

-- Épargne automatique chaque semaine (p_amount nul = désactivée)
create or replace function public.savings_set_auto(p_amount bigint, p_day int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_amount is not null and (p_amount < 100 or p_amount > 1000000) then
    raise exception 'Montant automatique : entre 100 et 1 000 000 FCFA';
  end if;
  if p_amount is not null and (p_day is null or p_day < 1 or p_day > 7) then
    raise exception 'Jour invalide';
  end if;
  perform private.savings_row(auth.uid());
  update public.savings
    set auto_amount = p_amount, auto_day = case when p_amount is null then null else p_day end, updated_at = now()
    where user_id = auth.uid();
end;
$$;

create or replace function public.savings_history(p_limit int default 30)
returns table (id uuid, kind text, amount bigint, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.kind, m.amount, m.created_at
  from public.savings_movements m
  where m.user_id = auth.uid()
  order by m.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

-- Versements automatiques du jour (lancé chaque matin par le planificateur).
-- Si le solde Luna est insuffisant, le versement de la semaine est simplement sauté.
create or replace function private.run_auto_savings()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Africa/Brazzaville')::date;
  v_dow int := extract(isodow from v_today);
  v_done int := 0;
  r record;
begin
  for r in
    select s.user_id, s.auto_amount
    from public.savings s
    where s.auto_amount is not null and s.auto_day = v_dow
      and (s.last_auto_at is null or s.last_auto_at < v_today)
    for update of s skip locked
  loop
    update public.wallets set balance = balance - r.auto_amount, updated_at = now()
      where user_id = r.user_id and balance >= r.auto_amount;
    if found then
      update public.savings set balance = balance + r.auto_amount, updated_at = now() where user_id = r.user_id;
      insert into public.savings_movements (user_id, kind, amount) values (r.user_id, 'auto', r.auto_amount);
      v_done := v_done + 1;
    end if;
    update public.savings set last_auto_at = v_today where user_id = r.user_id;
  end loop;
  return v_done;
end;
$$;

-- Planification quotidienne à 7 h UTC (8 h à Brazzaville), si pg_cron est disponible
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('luna-epargne-auto', '0 7 * * *', 'select private.run_auto_savings()');
  end if;
end;
$$;

-- ===========================================================================
-- Appels audio / vidéo (WebRTC). Le serveur relaie seulement la mise en relation ;
-- le son et l'image passent directement entre les deux téléphones.
-- ===========================================================================

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('audio', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'declined', 'cancelled', 'ended')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  check (caller_id <> callee_id)
);
create index calls_callee_idx on public.calls (callee_id, created_at desc);
create index calls_caller_idx on public.calls (caller_id, created_at desc);

create table public.call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.calls (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('offer', 'answer', 'ice')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index call_signals_call_idx on public.call_signals (call_id, id);

alter table public.calls enable row level security;
alter table public.call_signals enable row level security;
create policy "Voir ses appels" on public.calls
  for select to authenticated using (auth.uid() = caller_id or auth.uid() = callee_id);
create policy "Voir les signaux de ses appels" on public.call_signals
  for select to authenticated using (
    exists (select 1 from public.calls c
            where c.id = call_id and (auth.uid() = c.caller_id or auth.uid() = c.callee_id))
  );
revoke all on public.calls, public.call_signals from anon, authenticated;
grant select on public.calls, public.call_signals to authenticated;

-- Notification en direct des appels entrants (si la publication existe)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.calls;
  end if;
end;
$$;

-- Un appel sans réponse au bout de 45 secondes est considéré comme manqué
create or replace function private.call_ring_expired(p_created timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$ select p_created < now() - interval '45 seconds' $$;

create or replace function public.start_call(p_contact text, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_callee uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_kind not in ('audio', 'video') then
    raise exception 'Type d''appel invalide';
  end if;
  v_callee := private.profile_id_for(p_contact);
  if v_callee is null then
    raise exception 'Cette personne n''a pas encore de compte Luna';
  end if;
  if v_callee = auth.uid() then
    raise exception 'Vous ne pouvez pas vous appeler vous-même';
  end if;
  if (select count(*) from public.calls
      where caller_id = auth.uid() and created_at > now() - interval '1 minute') >= 6 then
    raise exception 'Trop d''appels, patientez une minute';
  end if;
  -- Un seul appel sortant à la fois
  update public.calls set status = 'cancelled', ended_at = now()
    where caller_id = auth.uid() and status = 'ringing';

  insert into public.calls (caller_id, callee_id, kind)
    values (auth.uid(), v_callee, p_kind)
    returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.answer_call(p_call_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_call public.calls;
begin
  select * into v_call from public.calls where id = p_call_id for update;
  if v_call.id is null or v_call.callee_id is distinct from auth.uid() then
    raise exception 'Appel introuvable';
  end if;
  if v_call.status <> 'ringing' or private.call_ring_expired(v_call.created_at) then
    raise exception 'Cet appel est terminé';
  end if;
  update public.calls
    set status = case when p_accept then 'accepted' else 'declined' end,
        answered_at = case when p_accept then now() end,
        ended_at = case when p_accept then null else now() end
    where id = p_call_id;
end;
$$;

create or replace function public.end_call(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calls
    set status = case when status = 'ringing' then 'cancelled' else 'ended' end,
        ended_at = now()
    where id = p_call_id
      and status in ('ringing', 'accepted')
      and (caller_id = auth.uid() or callee_id = auth.uid());
end;
$$;

create or replace function public.send_call_signal(p_call_id uuid, p_kind text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind not in ('offer', 'answer', 'ice') then
    raise exception 'Signal invalide';
  end if;
  if octet_length(p_payload::text) > 20000 then
    raise exception 'Signal trop volumineux';
  end if;
  if not exists (
    select 1 from public.calls
    where id = p_call_id and status in ('ringing', 'accepted')
      and (caller_id = auth.uid() or callee_id = auth.uid())
  ) then
    raise exception 'Cet appel est terminé';
  end if;
  if (select count(*) from public.call_signals where call_id = p_call_id and sender_id = auth.uid()) >= 200 then
    raise exception 'Trop de signaux pour cet appel';
  end if;
  insert into public.call_signals (call_id, sender_id, kind, payload)
    values (p_call_id, auth.uid(), p_kind, p_payload);
end;
$$;

-- État de l'appel et signaux reçus de l'autre personne depuis p_after
create or replace function public.call_poll(p_call_id uuid, p_after bigint default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_call public.calls;
begin
  select * into v_call from public.calls
    where id = p_call_id and (caller_id = auth.uid() or callee_id = auth.uid());
  if v_call.id is null then
    raise exception 'Appel introuvable';
  end if;
  return jsonb_build_object(
    'status', case when v_call.status = 'ringing' and private.call_ring_expired(v_call.created_at)
                   then 'missed' else v_call.status end,
    'signals', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'payload', s.payload) order by s.id)
      from public.call_signals s
      where s.call_id = p_call_id and s.sender_id <> auth.uid() and s.id > coalesce(p_after, 0)
    ), '[]'::jsonb)
  );
end;
$$;

-- Appel entrant en cours de sonnerie (le plus récent), ou rien
create or replace function public.incoming_call()
returns table (id uuid, contact text, kind text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, p.contact, c.kind, c.created_at
  from public.calls c
  join public.profiles p on p.id = c.caller_id
  where c.callee_id = auth.uid() and c.status = 'ringing'
    and not private.call_ring_expired(c.created_at)
  order by c.created_at desc
  limit 1;
$$;

create or replace function public.my_calls(p_limit int default 30)
returns table (
  id uuid,
  contact text,
  kind text,
  outgoing boolean,
  status text,
  created_at timestamptz,
  duration_seconds int
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, p.contact, c.kind, c.caller_id = auth.uid(),
         case
           when c.status = 'ringing' and private.call_ring_expired(c.created_at) then 'missed'
           when c.status = 'cancelled' and c.callee_id = auth.uid() then 'missed'
           else c.status
         end,
         c.created_at,
         case when c.answered_at is not null
              then extract(epoch from coalesce(c.ended_at, now()) - c.answered_at)::int end
  from public.calls c
  join public.profiles p on p.id = case when c.caller_id = auth.uid() then c.callee_id else c.caller_id end
  where c.caller_id = auth.uid() or c.callee_id = auth.uid()
  order by c.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- ===========================================================================
-- Droits d'exécution
-- ===========================================================================

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function
  public.savings_status(), public.savings_deposit(bigint), public.savings_withdraw(bigint),
  public.savings_set_goal(text, bigint), public.savings_lock(int), public.savings_set_auto(bigint, int),
  public.savings_history(int),
  public.start_call(text, text), public.answer_call(uuid, boolean), public.end_call(uuid),
  public.send_call_signal(uuid, text, jsonb), public.call_poll(uuid, bigint),
  public.incoming_call(), public.my_calls(int)
  from public, anon;
grant execute on function
  public.savings_status(), public.savings_deposit(bigint), public.savings_withdraw(bigint),
  public.savings_set_goal(text, bigint), public.savings_lock(int), public.savings_set_auto(bigint, int),
  public.savings_history(int),
  public.start_call(text, text), public.answer_call(uuid, boolean), public.end_call(uuid),
  public.send_call_signal(uuid, text, jsonb), public.call_poll(uuid, bigint),
  public.incoming_call(), public.my_calls(int)
  to authenticated;
