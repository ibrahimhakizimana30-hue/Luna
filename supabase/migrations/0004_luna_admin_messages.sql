-- Luna : administration des pièces d'identité (KYC) et messagerie réelle.

-- ---------------------------------------------------------------------------
-- Administrateurs
-- ---------------------------------------------------------------------------

-- Liste des comptes administrateurs (illisible par l'application).
-- Pour nommer un administrateur, dans l'éditeur SQL de Supabase :
--   insert into private.admins (user_id)
--     select id from public.profiles where contact = 'adresse@exemple.com';
create table private.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = auth.uid());
$$;

-- Demandes de vérification, avec le contact de la personne
create or replace function public.admin_list_kyc(p_status text default 'pending')
returns table (
  id uuid,
  user_id uuid,
  contact text,
  doc_type text,
  recto_path text,
  verso_path text,
  selfie_path text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé à l''administrateur';
  end if;
  return query
    select k.id, k.user_id, p.contact, k.doc_type, k.recto_path, k.verso_path,
           k.selfie_path, k.status, k.created_at
    from public.kyc_submissions k
    join public.profiles p on p.id = k.user_id
    where p_status is null or k.status = p_status
    order by k.created_at desc
    limit 200;
end;
$$;

-- Valider ou refuser une demande (seulement si elle est en attente)
create or replace function public.admin_review_kyc(p_submission_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé à l''administrateur';
  end if;
  if not exists (
    select 1 from public.kyc_submissions where id = p_submission_id and status = 'pending'
  ) then
    raise exception 'Cette demande a déjà été traitée ou n''existe pas';
  end if;
  perform private.review_kyc(p_submission_id, p_approve);
end;
$$;

-- L'administrateur peut ouvrir les photos des pièces d'identité
create policy "Admin lit les pièces KYC" on storage.objects
  for select to authenticated
  using (bucket_id = 'kyc' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Messagerie
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

alter table public.messages enable row level security;
create policy "Lire ses messages" on public.messages
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Écriture uniquement par les fonctions ci-dessous
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;

-- Réception en direct des nouveaux messages (si la publication existe)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Trouve le profil Luna d'un contact (email ou numéro)
create or replace function private.profile_id_for(p_contact text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where contact = private.normalize_contact(p_contact);
$$;

create or replace function public.send_message(p_recipient_contact text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_message public.messages;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  if v_body = '' then
    raise exception 'Le message est vide';
  end if;
  if char_length(v_body) > 2000 then
    raise exception 'Message trop long (2000 caractères au maximum)';
  end if;
  v_recipient := private.profile_id_for(p_recipient_contact);
  if v_recipient is null then
    raise exception 'Cette personne n''a pas encore de compte Luna';
  end if;
  if v_recipient = auth.uid() then
    raise exception 'Vous ne pouvez pas vous écrire à vous-même';
  end if;
  -- Anti-spam : 30 messages par minute au maximum
  if (select count(*) from public.messages
      where sender_id = auth.uid() and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Trop de messages envoyés, patientez une minute';
  end if;

  insert into public.messages (sender_id, recipient_id, body)
    values (auth.uid(), v_recipient, v_body)
    returning * into v_message;

  return jsonb_build_object('id', v_message.id, 'created_at', v_message.created_at);
end;
$$;

-- Liste des conversations : dernier message et nombre de messages non lus
create or replace function public.my_conversations()
returns table (
  contact text,
  last_body text,
  last_at timestamptz,
  last_from_me boolean,
  unread int
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select m.*,
           case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as other_id
    from public.messages m
    where m.sender_id = auth.uid() or m.recipient_id = auth.uid()
  ),
  last_msg as (
    select distinct on (other_id) other_id, body, created_at, sender_id = auth.uid() as from_me
    from mine
    order by other_id, created_at desc
  )
  select p.contact, l.body, l.created_at, l.from_me,
         (select count(*)::int from mine u
          where u.other_id = l.other_id and u.recipient_id = auth.uid() and u.read_at is null)
  from last_msg l
  join public.profiles p on p.id = l.other_id
  order by l.created_at desc;
$$;

-- Messages échangés avec un contact (du plus ancien au plus récent).
-- Les messages reçus de ce contact sont marqués comme lus.
create or replace function public.conversation_messages(p_contact text, p_limit int default 100)
returns table (
  id uuid,
  from_me boolean,
  body text,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other uuid;
begin
  if auth.uid() is null then
    raise exception 'Non connecté';
  end if;
  v_other := private.profile_id_for(p_contact);
  if v_other is null then
    raise exception 'Cette personne n''a pas encore de compte Luna';
  end if;

  update public.messages m
    set read_at = now()
    where m.sender_id = v_other and m.recipient_id = auth.uid() and m.read_at is null;

  return query
    select x.id, x.from_me, x.body, x.created_at, x.read_at
    from (
      select m.id, m.sender_id = auth.uid() as from_me, m.body, m.created_at, m.read_at
      from public.messages m
      where (m.sender_id = auth.uid() and m.recipient_id = v_other)
         or (m.sender_id = v_other and m.recipient_id = auth.uid())
      order by m.created_at desc
      limit least(greatest(p_limit, 1), 500)
    ) x
    order by x.created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.is_admin(), public.admin_list_kyc(text),
  public.admin_review_kyc(uuid, boolean), public.send_message(text, text),
  public.my_conversations(), public.conversation_messages(text, int) from public, anon;
grant execute on function public.is_admin(), public.admin_list_kyc(text),
  public.admin_review_kyc(uuid, boolean), public.send_message(text, text),
  public.my_conversations(), public.conversation_messages(text, int) to authenticated;
