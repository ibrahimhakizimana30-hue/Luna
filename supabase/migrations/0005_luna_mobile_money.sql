-- Luna : paiements directs par Mobile Money (MTN MoMo, Airtel Money).
--
-- Luna ne touche jamais l'argent : l'utilisateur paie lui-même depuis le menu
-- de son opérateur. Luna garde seulement une trace de ce que l'utilisateur
-- DÉCLARE avoir payé (non vérifié), pour son historique.

create table public.mobile_money_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  operator text not null check (operator in ('mtn', 'airtel')),
  recipient_phone text not null check (recipient_phone ~ '^\+242[0-9]{9}$'),
  amount bigint not null check (amount between 1 and 10000000), -- en FCFA
  note text check (note is null or char_length(note) <= 140),
  created_at timestamptz not null default now()
);
create index mobile_money_payments_user_idx on public.mobile_money_payments (user_id, created_at desc);

alter table public.mobile_money_payments enable row level security;
create policy "Lire ses paiements Mobile Money" on public.mobile_money_payments
  for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.mobile_money_payments from anon, authenticated;
grant select on public.mobile_money_payments to authenticated;

create or replace function public.declare_mobile_money_payment(
  p_operator text,
  p_recipient_phone text,
  p_amount bigint,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := private.normalize_contact(p_recipient_phone);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if p_operator not in ('mtn', 'airtel') then
    raise exception 'Opérateur inconnu';
  end if;
  if v_phone is null or v_phone !~ '^\+242[0-9]{9}$' then
    raise exception 'Numéro invalide : il faut un numéro du Congo à 9 chiffres (ex. 06 123 4567)';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000000 then
    raise exception 'Montant invalide';
  end if;
  if v_note is not null and char_length(v_note) > 140 then
    raise exception 'Note trop longue (140 caractères au maximum)';
  end if;
  -- Anti-abus : 30 déclarations par heure au maximum
  if (select count(*) from public.mobile_money_payments
      where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Trop de paiements déclarés, réessayez plus tard';
  end if;

  insert into public.mobile_money_payments (user_id, operator, recipient_phone, amount, note)
    values (auth.uid(), p_operator, v_phone, p_amount, v_note)
    returning id into v_id;
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.my_mobile_money_payments(p_limit int default 50)
returns table (
  id uuid,
  operator text,
  recipient_phone text,
  amount bigint,
  note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.operator, m.recipient_phone, m.amount, m.note, m.created_at
  from public.mobile_money_payments m
  where m.user_id = auth.uid()
  order by m.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

revoke execute on function public.declare_mobile_money_payment(text, text, bigint, text),
  public.my_mobile_money_payments(int) from public, anon;
grant execute on function public.declare_mobile_money_payment(text, text, bigint, text),
  public.my_mobile_money_payments(int) to authenticated;
