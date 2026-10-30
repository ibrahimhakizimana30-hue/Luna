\set ON_ERROR_STOP 1
-- Tests : administration KYC et messagerie (à lancer après luna_rules_test.sql)
reset role;
insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'admin@test.cg'),
  ('c1111111-1111-1111-1111-111111111111', 'carla@test.cg'),
  ('d1111111-1111-1111-1111-111111111111', 'dan@test.cg');
insert into private.admins (user_id) values ('a1111111-1111-1111-1111-111111111111');

create function pg_temp.check2(cond boolean, label text) returns void language plpgsql as
$$ begin if cond then raise notice 'PASS %', label; else raise exception 'FAIL %', label; end if; end $$;
create function pg_temp.fails2(sql text, expected text, label text) returns void language plpgsql as
$$ begin execute sql; raise exception 'FAIL % (aucune erreur)', label;
   exception when others then
     if sqlerrm like 'FAIL%' then raise; end if;
     if sqlerrm ilike '%' || expected || '%' then raise notice 'PASS % -> %', label, sqlerrm;
     else raise exception 'FAIL % : erreur inattendue %', label, sqlerrm; end if; end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- === Carla envoie une demande KYC ===
set role authenticated; set request.jwt.claim.sub = 'c1111111-1111-1111-1111-111111111111';
select submit_kyc('id-card', 'c1111111-1111-1111-1111-111111111111/recto.jpg', null,
                  'c1111111-1111-1111-1111-111111111111/selfie.jpg');
select pg_temp.check2(not is_admin(), 'Carla n''est pas administratrice');
select pg_temp.fails2($$select * from admin_list_kyc('pending')$$, 'réservé', 'liste KYC refusée aux non-admins');
select pg_temp.fails2($$select admin_review_kyc(gen_random_uuid(), true)$$, 'réservé', 'validation refusée aux non-admins');
select pg_temp.fails2($$select * from private.admins$$, 'permission denied', 'table des admins illisible');
select pg_temp.fails2($$insert into private.admins values (auth.uid())$$, 'permission denied', 'impossible de se nommer admin');

-- === L'administrateur valide ===
reset role; set role authenticated; set request.jwt.claim.sub = 'a1111111-1111-1111-1111-111111111111';
select pg_temp.check2(is_admin(), 'admin reconnu');
select pg_temp.check2((select count(*) from admin_list_kyc('pending') where contact = 'carla@test.cg') = 1, 'admin voit la demande de Carla');
select admin_review_kyc((select id from admin_list_kyc('pending') where contact = 'carla@test.cg'), true);
reset role;
select pg_temp.check2((select kyc_status from profiles where id = 'c1111111-1111-1111-1111-111111111111') = 'approved', 'Carla validée');
set role authenticated; set request.jwt.claim.sub = 'a1111111-1111-1111-1111-111111111111';
select pg_temp.fails2($$select admin_review_kyc((select id from admin_list_kyc(null) where contact = 'carla@test.cg'), false)$$,
  'déjà été traitée', 'une demande traitée ne peut pas être modifiée');
select pg_temp.check2((select count(*) from admin_list_kyc('approved') where contact = 'carla@test.cg') = 1, 'filtre « validées »');

-- === Messagerie ===
reset role; set role authenticated; set request.jwt.claim.sub = 'c1111111-1111-1111-1111-111111111111';
select send_message('dan@test.cg', '  Bonjour Dan  ');
select send_message('DAN@test.cg', 'Tu es là ?');
select pg_temp.fails2($$select send_message('inconnu@test.cg', 'hello')$$, 'pas encore de compte', 'destinataire inconnu refusé');
select pg_temp.fails2($$select send_message('carla@test.cg', 'moi')$$, 'vous-même', 'message à soi-même refusé');
select pg_temp.fails2($$select send_message('dan@test.cg', '   ')$$, 'vide', 'message vide refusé');
select pg_temp.fails2($$select send_message('dan@test.cg', repeat('a', 2001))$$, 'trop long', 'message trop long refusé');
select pg_temp.fails2($$insert into messages (sender_id, recipient_id, body) values (auth.uid(), 'd1111111-1111-1111-1111-111111111111', 'x')$$,
  'permission denied', 'écriture directe interdite');
select pg_temp.fails2($$update messages set body = 'modifié'$$, 'permission denied', 'modification interdite');
select pg_temp.check2((select body from messages order by created_at limit 1) = 'Bonjour Dan', 'espaces retirés');

-- Dan lit
reset role; set role authenticated; set request.jwt.claim.sub = 'd1111111-1111-1111-1111-111111111111';
select pg_temp.check2((select unread from my_conversations() where contact = 'carla@test.cg') = 2, 'Dan a 2 messages non lus');
select pg_temp.check2((select count(*) from conversation_messages('carla@test.cg')) = 2, 'Dan voit la conversation');
select pg_temp.check2((select unread from my_conversations() where contact = 'carla@test.cg') = 0, 'messages marqués comme lus');
select send_message('carla@test.cg', 'Oui !');
select pg_temp.check2((select last_from_me and last_body = 'Oui !' from my_conversations() where contact = 'carla@test.cg'), 'dernier message affiché');

-- L'administrateur (tiers) ne voit pas ces messages
reset role; set role authenticated; set request.jwt.claim.sub = 'a1111111-1111-1111-1111-111111111111';
select pg_temp.check2((select count(*) from messages) = 0, 'un tiers ne lit pas les messages des autres');
select pg_temp.check2((select count(*) from my_conversations()) = 0, 'un tiers n''a aucune conversation');

-- Anti-spam
reset role; set role authenticated; set request.jwt.claim.sub = 'd1111111-1111-1111-1111-111111111111';
select send_message('carla@test.cg', 'm' || g) from generate_series(1, 29) g;
select pg_temp.fails2($$select send_message('carla@test.cg', 'trop')$$, 'Trop de messages', 'anti-spam 30 messages par minute');

-- Visiteur non connecté
reset role; set role anon; set request.jwt.claim.sub = '';
select pg_temp.fails2($$select send_message('dan@test.cg', 'x')$$, 'permission denied', 'visiteur ne peut pas écrire');
select pg_temp.fails2($$select * from messages$$, 'permission denied', 'visiteur ne peut pas lire');
