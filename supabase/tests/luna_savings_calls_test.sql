\set ON_ERROR_STOP 1
-- Tests : épargne et appels
reset role;
insert into auth.users (id, email) values
  ('f1111111-1111-1111-1111-111111111111', 'fanny@test.cg'),
  ('f2222222-2222-2222-2222-222222222222', 'gael@test.cg'),
  ('f3333333-3333-3333-3333-333333333333', 'hugo@test.cg');
create function pg_temp.check4(cond boolean, label text) returns void language plpgsql as
$$ begin if cond then raise notice 'PASS %', label; else raise exception 'FAIL %', label; end if; end $$;
create function pg_temp.fails4(sql text, expected text, label text) returns void language plpgsql as
$$ begin execute sql; raise exception 'FAIL % (aucune erreur)', label;
   exception when others then
     if sqlerrm like 'FAIL%' then raise; end if;
     if sqlerrm ilike '%' || expected || '%' then raise notice 'PASS % -> %', label, sqlerrm;
     else raise exception 'FAIL % : erreur inattendue %', label, sqlerrm; end if; end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ===== Épargne (Fanny) =====
set role authenticated; set request.jwt.claim.sub = 'f1111111-1111-1111-1111-111111111111';
select pg_temp.check4((savings_status()->>'balance')::bigint = 0 and (savings_status()->>'wallet_balance')::bigint = 50000, 'épargne vide, solde 50 000');
select savings_deposit(20000);
select pg_temp.check4((savings_status()->>'balance')::bigint = 20000 and (savings_status()->>'wallet_balance')::bigint = 30000, 'versement : 20 000 passent du solde à l''épargne');
select pg_temp.fails4($$select savings_deposit(50)$$, 'minimum', 'versement < 100 refusé');
select pg_temp.fails4($$select savings_deposit(999999)$$, 'insuffisant', 'versement > solde refusé');
select savings_withdraw(5000);
select pg_temp.check4((savings_status()->>'balance')::bigint = 15000 and (savings_status()->>'wallet_balance')::bigint = 35000, 'retrait : 5 000 reviennent au solde');
select pg_temp.fails4($$select savings_withdraw(999999)$$, 'insuffisante', 'retrait > épargne refusé');
select pg_temp.check4((savings_status()->>'month_change')::bigint = 15000, 'variation du mois');
select savings_set_goal('Moto', 500000);
select pg_temp.check4(savings_status()->>'goal_name' = 'Moto' and (savings_status()->>'goal_amount')::bigint = 500000, 'objectif enregistré');
select pg_temp.fails4($$select savings_set_goal('Moto', 10)$$, 'au moins 100', 'objectif trop petit refusé');
select savings_lock(30);
select pg_temp.check4(savings_status()->>'locked_until' is not null, 'épargne bloquée 30 jours');
select pg_temp.fails4($$select savings_withdraw(100)$$, 'bloquée', 'retrait impossible pendant le blocage');
select savings_deposit(1000);
select pg_temp.check4((savings_status()->>'balance')::bigint = 16000, 'versement possible pendant le blocage');
select pg_temp.check4(savings_lock(1) > now() + interval '30 days', 'blocage seulement prolongé, jamais raccourci');
select pg_temp.fails4($$select savings_lock(0)$$, 'entre 1 et 365', 'durée de blocage invalide');
select savings_set_auto(2000, 3);
select pg_temp.check4((savings_status()->>'auto_amount')::bigint = 2000 and (savings_status()->>'auto_day')::int = 3, 'épargne automatique réglée');
select pg_temp.fails4($$select savings_set_auto(50, 3)$$, 'entre 100', 'montant automatique trop petit');
select pg_temp.fails4($$update savings set balance = 9999999$$, 'permission denied', 'modification directe de l''épargne interdite');
select pg_temp.fails4($$select private.run_auto_savings()$$, 'permission denied', 'versement automatique réservé au serveur');
select pg_temp.check4((select count(*) from savings_history()) = 3, 'historique de l''épargne');

-- Versement automatique (lancé par le serveur), le bon jour
reset role;
update savings set auto_day = extract(isodow from (now() at time zone 'Africa/Brazzaville')::date) where user_id = 'f1111111-1111-1111-1111-111111111111';
select pg_temp.check4(private.run_auto_savings() = 1, 'versement automatique effectué');
select pg_temp.check4(private.run_auto_savings() = 0, 'pas deux versements automatiques le même jour');
select pg_temp.check4((select balance from savings where user_id = 'f1111111-1111-1111-1111-111111111111') = 18000, 'épargne + 2 000 automatiques');
-- Solde insuffisant : versement sauté sans erreur
insert into savings (user_id, auto_amount, auto_day) values ('f3333333-3333-3333-3333-333333333333', 1000000, extract(isodow from (now() at time zone 'Africa/Brazzaville')::date));
select pg_temp.check4(private.run_auto_savings() = 0, 'solde insuffisant : versement automatique sauté');
select pg_temp.check4((select balance from wallets where user_id = 'f3333333-3333-3333-3333-333333333333') = 50000, 'solde intact si versement sauté');

-- Un tiers ne voit pas l'épargne de Fanny
set role authenticated; set request.jwt.claim.sub = 'f2222222-2222-2222-2222-222222222222';
select pg_temp.check4((select count(*) from savings where user_id = 'f1111111-1111-1111-1111-111111111111') = 0, 'un tiers ne voit pas l''épargne des autres');

-- ===== Appels =====
reset role; set role authenticated; set request.jwt.claim.sub = 'f1111111-1111-1111-1111-111111111111';
select pg_temp.fails4($$select start_call('inconnu@test.cg', 'audio')$$, 'pas encore de compte', 'appel vers inconnu refusé');
select pg_temp.fails4($$select start_call('fanny@test.cg', 'audio')$$, 'vous-même', 'appel à soi-même refusé');
select pg_temp.fails4($$select start_call('gael@test.cg', 'fax')$$, 'invalide', 'type d''appel invalide');
create temp table t_call as select start_call('Gael@test.cg', 'video') as id;
grant select on t_call to authenticated;
select send_call_signal((select id from t_call), 'offer', '{"type":"offer","sdp":"x"}');
select send_call_signal((select id from t_call), 'ice', '{"candidate":"c1"}');
select pg_temp.fails4($$select send_call_signal((select id from t_call), 'ice', jsonb_build_object('c', repeat('x', 30000)))$$, 'volumineux', 'signal trop gros refusé');
select pg_temp.check4(jsonb_array_length(call_poll((select id from t_call))->'signals') = 0, 'l''appelant ne reçoit pas ses propres signaux');

-- Gaël reçoit l'appel
reset role; set role authenticated; set request.jwt.claim.sub = 'f2222222-2222-2222-2222-222222222222';
select pg_temp.check4((select contact = 'fanny@test.cg' and kind = 'video' from incoming_call()), 'Gaël voit l''appel vidéo entrant de Fanny');
select pg_temp.check4(jsonb_array_length(call_poll((select id from t_call))->'signals') = 2, 'Gaël reçoit l''offre et le candidat');
select pg_temp.check4((call_poll((select id from t_call), (select max(id) from call_signals))->'signals') = '[]'::jsonb, 'reprise après le dernier signal reçu');
select answer_call((select id from t_call), true);
select pg_temp.check4(call_poll((select id from t_call))->>'status' = 'accepted', 'appel accepté');
select send_call_signal((select id from t_call), 'answer', '{"type":"answer","sdp":"y"}');
select pg_temp.fails4($$select answer_call((select id from t_call), true)$$, 'terminé', 'réponse en double refusée');

-- Hugo (tiers) ne voit rien et ne peut rien faire
reset role; set role authenticated; set request.jwt.claim.sub = 'f3333333-3333-3333-3333-333333333333';
select pg_temp.fails4($$select call_poll((select id from t_call))$$, 'introuvable', 'un tiers ne peut pas suivre l''appel');
select pg_temp.fails4($$select send_call_signal((select id from t_call), 'ice', '{}')$$, 'terminé', 'un tiers ne peut pas envoyer de signal');
select pg_temp.fails4($$select answer_call((select id from t_call), true)$$, 'introuvable', 'un tiers ne peut pas répondre');
select end_call((select id from t_call));
select pg_temp.check4((select count(*) from calls) = 0 and (select count(*) from call_signals) = 0, 'un tiers ne voit ni appels ni signaux');

-- Fanny raccroche
reset role; set role authenticated; set request.jwt.claim.sub = 'f1111111-1111-1111-1111-111111111111';
select pg_temp.check4(call_poll((select id from t_call))->>'status' = 'accepted', 'le tiers n''a pas pu raccrocher');
select pg_temp.check4(jsonb_array_length(call_poll((select id from t_call))->'signals') = 1, 'Fanny reçoit la réponse de Gaël');
select end_call((select id from t_call));
select pg_temp.check4(call_poll((select id from t_call))->>'status' = 'ended', 'appel terminé');
select pg_temp.fails4($$select send_call_signal((select id from t_call), 'ice', '{}')$$, 'terminé', 'pas de signal après la fin');
select pg_temp.check4((select outgoing and status = 'ended' and duration_seconds is not null from my_calls() limit 1), 'historique : appel sortant terminé avec durée');

-- Appel manqué : sonnerie de plus de 45 secondes
select start_call('gael@test.cg', 'audio');
reset role;
update calls set created_at = now() - interval '1 minute' where status = 'ringing';
set role authenticated; set request.jwt.claim.sub = 'f2222222-2222-2222-2222-222222222222';
select pg_temp.check4((select count(*) from incoming_call()) = 0, 'appel expiré : plus de sonnerie');
select pg_temp.check4((select count(*) from my_calls() where status = 'missed' and not outgoing) = 1, 'Gaël voit un appel manqué');
select pg_temp.fails4($$select answer_call((select id from calls where status = 'ringing' limit 1), true)$$, 'terminé', 'impossible de décrocher un appel expiré');

-- Refus d'appel
reset role; set role authenticated; set request.jwt.claim.sub = 'f1111111-1111-1111-1111-111111111111';
create temp table t_call2 as select start_call('gael@test.cg', 'audio') as id;
grant select on t_call2 to authenticated;
reset role; set role authenticated; set request.jwt.claim.sub = 'f2222222-2222-2222-2222-222222222222';
select answer_call((select id from t_call2), false);
reset role; set role authenticated; set request.jwt.claim.sub = 'f1111111-1111-1111-1111-111111111111';
select pg_temp.check4(call_poll((select id from t_call2))->>'status' = 'declined', 'appel refusé vu par l''appelant');

-- Visiteur
reset role; set role anon; set request.jwt.claim.sub = '';
select pg_temp.fails4($$select start_call('gael@test.cg', 'audio')$$, 'permission denied', 'visiteur ne peut pas appeler');
select pg_temp.fails4($$select savings_status()$$, 'permission denied', 'visiteur sans épargne');
