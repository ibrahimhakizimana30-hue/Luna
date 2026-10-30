\set ON_ERROR_STOP 1
-- Tests : notifications
reset role;
insert into auth.users (id, email) values
  ('a7777777-7777-7777-7777-777777777777', 'ines@test.cg'),
  ('b7777777-7777-7777-7777-777777777777', 'jo@test.cg');
create function pg_temp.check5(cond boolean, label text) returns void language plpgsql as
$$ begin if cond then raise notice 'PASS %', label; else raise exception 'FAIL %', label; end if; end $$;
create function pg_temp.fails5(sql text, expected text, label text) returns void language plpgsql as
$$ begin execute sql; raise exception 'FAIL % (aucune erreur)', label;
   exception when others then
     if sqlerrm like 'FAIL%' then raise; end if;
     if sqlerrm ilike '%' || expected || '%' then raise notice 'PASS % -> %', label, sqlerrm;
     else raise exception 'FAIL % : erreur inattendue %', label, sqlerrm; end if; end $$;
grant execute on all functions in schema pg_temp to authenticated;
delete from net.requests;

-- Sans abonnement : aucune notification
set role authenticated; set request.jwt.claim.sub = 'a7777777-7777-7777-7777-777777777777';
select send_message('jo@test.cg', 'Bonjour Jo');
reset role;
select pg_temp.check5((select count(*) from net.requests) = 0, 'pas de téléphone abonné : rien envoyé');

-- Jo active les notifications
set role authenticated; set request.jwt.claim.sub = 'b7777777-7777-7777-7777-777777777777';
select pg_temp.fails5($$select save_push_subscription('http://pas-securise', 'k', 'a')$$, 'invalide', 'adresse non https refusée');
select save_push_subscription('https://push.example/abc', 'cle-p256dh', 'cle-auth');
select save_push_subscription('https://push.example/abc', 'cle-p256dh-2', 'cle-auth-2');
select pg_temp.check5((select count(*) from push_subscriptions) = 1, 'abonnement enregistré une seule fois');
select pg_temp.check5((get_notification_settings()->>'messages')::boolean, 'réglages par défaut : tout activé');
select pg_temp.fails5($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values (auth.uid(), 'https://x/y', 'a', 'b')$$, 'permission denied', 'écriture directe interdite');
select pg_temp.fails5($$select push_config()$$, 'permission denied', 'configuration secrète inaccessible aux utilisateurs');

-- Message pour Jo -> notification
reset role; set role authenticated; set request.jwt.claim.sub = 'a7777777-7777-7777-7777-777777777777';
select send_message('jo@test.cg', 'Tu viens ce soir ?');
reset role;
select pg_temp.check5((select count(*) from net.requests) = 1, 'message : 1 notification envoyée');
select pg_temp.check5((select body->>'title' = 'Message de ines@test.cg' and body->>'body' = 'Tu viens ce soir ?' and body->>'url' = '/?tab=messages' from net.requests order by id desc limit 1), 'contenu de la notification de message');
select pg_temp.check5((select headers->>'x-luna-secret' = 'secret-de-test' and url like '%/functions/v1/send-push' from net.requests order by id desc limit 1), 'appel sécurisé de la fonction d''envoi');
-- Ines ne reçoit rien (pas abonnée)
set role authenticated; set request.jwt.claim.sub = 'b7777777-7777-7777-7777-777777777777';
select send_message('ines@test.cg', 'Oui !');
reset role;
select pg_temp.check5((select count(*) from net.requests) = 1, 'l''expéditeur n''est pas notifié de son propre message');

-- Aperçu désactivé
set role authenticated; set request.jwt.claim.sub = 'b7777777-7777-7777-7777-777777777777';
select set_notification_settings(true, true, true, true, false);
reset role; set role authenticated; set request.jwt.claim.sub = 'a7777777-7777-7777-7777-777777777777';
select send_message('jo@test.cg', 'Secret');
reset role;
select pg_temp.check5((select body->>'body' = 'Nouveau message sur Luna' from net.requests order by id desc limit 1), 'aperçu masqué si désactivé');

-- Messages désactivés
set role authenticated; set request.jwt.claim.sub = 'b7777777-7777-7777-7777-777777777777';
select set_notification_settings(false, true, true, true, true);
reset role; set role authenticated; set request.jwt.claim.sub = 'a7777777-7777-7777-7777-777777777777';
select send_message('jo@test.cg', 'Encore');
reset role;
select pg_temp.check5((select count(*) from net.requests) = 2, 'messages désactivés : pas de notification');

-- Appel entrant
set role authenticated; set request.jwt.claim.sub = 'a7777777-7777-7777-7777-777777777777';
select start_call('jo@test.cg', 'video');
reset role;
select pg_temp.check5((select body->>'title' = 'Appel vidéo entrant' and body->>'category' = 'calls' from net.requests order by id desc limit 1), 'appel : notification « Appel vidéo entrant »');

-- Argent reçu
set role authenticated; set request.jwt.claim.sub = 'a7777777-7777-7777-7777-777777777777';
select set_pin('2580');
select transfer('jo@test.cg', 12500, '2580');
reset role;
select pg_temp.check5((select body->>'title' = 'Argent reçu' and body->>'body' = '12 500 FCFA reçus de ines@test.cg' from net.requests order by id desc limit 1), 'argent reçu : montant et expéditeur');

-- Vérification d'identité
update profiles set kyc_status = 'approved' where id = 'b7777777-7777-7777-7777-777777777777';
select pg_temp.check5((select body->>'title' = 'Identité vérifiée ✅' from net.requests order by id desc limit 1), 'identité validée : notification');

-- Un problème d'envoi ne bloque pas le message
drop function net.http_post(text, jsonb, jsonb, jsonb, int);
set role authenticated; set request.jwt.claim.sub = 'a7777777-7777-7777-7777-777777777777';
select start_call('jo@test.cg', 'audio');
select pg_temp.check5(true, 'appel enregistré malgré un échec d''envoi de notification');

-- Désabonnement
reset role; set role authenticated; set request.jwt.claim.sub = 'b7777777-7777-7777-7777-777777777777';
select delete_push_subscription('https://push.example/abc');
select pg_temp.check5((select count(*) from push_subscriptions) = 0, 'désabonnement');
reset role; set role anon; set request.jwt.claim.sub = '';
select pg_temp.fails5($$select save_push_subscription('https://x/y', 'a', 'b')$$, 'permission denied', 'visiteur ne peut pas s''abonner');
