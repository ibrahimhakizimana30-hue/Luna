\set ON_ERROR_STOP 1
-- Comptes de test
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.cg'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.cg');
insert into auth.users (id, phone) values ('33333333-3333-3333-3333-333333333333', '+242061234567');

create function pg_temp.check(cond boolean, label text) returns void language plpgsql as
$$ begin if cond then raise notice 'PASS %', label; else raise exception 'FAIL %', label; end if; end $$;
create function pg_temp.fails(sql text, expected text, label text) returns void language plpgsql as
$$ begin execute sql; raise exception 'FAIL % (aucune erreur)', label;
   exception when others then
     if sqlerrm like 'FAIL%' then raise; end if;
     if sqlerrm ilike '%' || expected || '%' then raise notice 'PASS % -> %', label, sqlerrm;
     else raise exception 'FAIL % : erreur inattendue %', label, sqlerrm; end if; end $$;
create function pg_temp.transfer_t(c text, a bigint) returns jsonb language plpgsql as
$$ declare r jsonb; begin r := public.transfer(c, a, '2580'); if not (r->>'ok')::boolean then raise exception 'PIN refusé %', r; end if; return r; end $$;
grant execute on all functions in schema pg_temp to authenticated;

select pg_temp.check((select count(*) from profiles) = 3, 'profils créés automatiquement');
insert into auth.users (id, phone) values ('44444444-4444-4444-4444-444444444444', '242051112233');
select pg_temp.check((select contact from profiles where id = '44444444-4444-4444-4444-444444444444') = '+242051112233', 'numéro Supabase sans + normalisé');
select pg_temp.check(private.normalize_contact('05 111 22 33') = '+242051112233', 'numéro local à 9 chiffres reçoit +242');
select pg_temp.check(private.normalize_contact(' Bob@Test.CG ') = 'bob@test.cg', 'email normalisé');
select pg_temp.check((select balance from wallets where user_id='11111111-1111-1111-1111-111111111111') = 50000, 'crédit de test 50 000 FCFA');

-- === Alice connectée ===
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.check((select count(*) from profiles) = 1, 'Alice ne voit que son profil');
select pg_temp.check((select count(*) from wallets) = 1, 'Alice ne voit que son portefeuille');
select pg_temp.fails($$update wallets set balance = 999999$$, 'permission denied', 'modification directe du solde interdite');
select pg_temp.fails($$update profiles set kyc_status = 'approved'$$, 'permission denied', 'auto-validation KYC interdite');
select pg_temp.fails($$select * from private.pins$$, 'permission denied', 'table des PIN illisible');
select pg_temp.fails($$select private.review_kyc(gen_random_uuid(), true)$$, 'permission denied', 'validation KYC réservée admin');

-- PIN
select pg_temp.check(not has_pin(), 'pas de PIN au départ');
select pg_temp.fails($$select set_pin('12a4')$$, '4 chiffres', 'PIN invalide refusé');
select set_pin('2580');
select pg_temp.check(has_pin(), 'PIN enregistré');
select pg_temp.check((verify_pin('2580')->>'ok')::boolean, 'bon PIN accepté');
select pg_temp.check((verify_pin('0000')->>'attempts_left')::int = 4, 'mauvais PIN : 4 essais restants');
select verify_pin('0000'); select verify_pin('0000'); select verify_pin('0000');
select pg_temp.check((verify_pin('0000')->>'locked_until') is not null, 'blocage après 5 échecs');
select pg_temp.check(not (verify_pin('2580')->>'ok')::boolean, 'bon PIN refusé pendant le blocage');

reset role; update private.pins set failed_attempts = 0, locked_until = null; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
-- Transferts
select pg_temp.fails($$select pg_temp.transfer_t('bob@test.cg', 50)$$, 'minimum', 'montant minimum');
select pg_temp.fails($$select pg_temp.transfer_t('inconnu@test.cg', 1000)$$, 'Aucun utilisateur', 'destinataire inconnu');
select pg_temp.fails($$select pg_temp.transfer_t('alice@test.cg', 1000)$$, 'vous envoyer', 'envoi à soi-même');
select pg_temp.transfer_t('BOB@test.cg', 10000);
select pg_temp.check((select balance from wallets) = 50000 - 10000 - 250, 'solde Alice débité montant + frais 2,5 %');
select pg_temp.fails($$select pg_temp.transfer_t('bob@test.cg', 40000)$$, 'Solde insuffisant', 'solde insuffisant');
select pg_temp.check((select count(*) from my_transactions()) = 1 and (select counterpart from my_transactions()) = 'bob@test.cg', 'historique Alice');
reset role;

-- Limite mensuelle du plan gratuit (50 000)
update wallets set balance = 1000000 where user_id = '11111111-1111-1111-1111-111111111111';
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.transfer_t('+242061234567', 40000);
select pg_temp.fails($$select pg_temp.transfer_t('bob@test.cg', 1000)$$, 'Limite mensuelle', 'limite mensuelle du plan gratuit');
reset role;

-- === Bob ===
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select set_pin('2580');
select pg_temp.check((select balance from wallets) = 60000, 'Bob crédité de 10 000');
select pg_temp.check((select direction from my_transactions()) = 'receive' and (select fee from my_transactions()) = 0, 'Bob voit la réception sans frais');
select pg_temp.check((select count(*) from transactions) = 1, 'Bob ne voit pas les transactions des autres');
-- KYC
select pg_temp.fails($$select submit_kyc('passport', '11111111-1111-1111-1111-111111111111/a.jpg', null, '22222222-2222-2222-2222-222222222222/s.jpg')$$, 'Fichiers invalides', 'KYC avec fichiers d''un autre refusé');
select submit_kyc('passport', '22222222-2222-2222-2222-222222222222/recto.jpg', null, '22222222-2222-2222-2222-222222222222/selfie.jpg');
select pg_temp.check((select kyc_status from profiles) = 'pending', 'KYC en attente (pas validé automatiquement)');
reset role;

-- Essai expiré sans KYC
update profiles set trial_started_at = now() - interval '8 days' where id = '22222222-2222-2222-2222-222222222222';
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.fails($$select pg_temp.transfer_t('alice@test.cg', 1000)$$, 'KYC requise', 'essai expiré : transfert bloqué');
reset role;
select private.review_kyc((select id from kyc_submissions limit 1), true);
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select pg_temp.check((select kyc_status from profiles) = 'approved', 'KYC approuvé par l''admin');
select pg_temp.transfer_t('alice@test.cg', 1000);
select pg_temp.check(true, 'transfert possible après KYC');
reset role;

-- Non connecté
set role anon; set request.jwt.claim.sub = '';
select pg_temp.fails($$select pg_temp.transfer_t('bob@test.cg', 1000)$$, 'permission denied', 'anonyme : transfert interdit');
select pg_temp.check((select count(*) from profiles) = 0, 'anonyme : aucun profil visible');
reset role;

-- Changement de PIN : exige une connexion par code récente
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set request.jwt.claims = '{"amr":[{"method":"password","timestamp":1}]}';
select pg_temp.fails($$select set_pin('1111')$$, 'Reconnectez-vous', 'changement de PIN sans connexion récente refusé');
select set_config('request.jwt.claims', jsonb_build_object('amr', jsonb_build_array(jsonb_build_object('method','otp','timestamp', extract(epoch from now())::bigint - 60)))::text, false);
select set_pin('1111');
select pg_temp.check((verify_pin('1111')->>'ok')::boolean, 'changement de PIN après code récent');
-- PIN faux lors d'un transfert : refusé, compteur conservé, blocage
select pg_temp.check(not (transfer('bob@test.cg', 1000, '9999')->>'ok')::boolean, 'transfert avec mauvais PIN refusé');
select pg_temp.check((transfer('bob@test.cg', 1000, '9999')->'pin'->>'attempts_left')::int = 3, 'échecs de PIN comptés via transfert');
select transfer('bob@test.cg', 1000, '9999'); select transfer('bob@test.cg', 1000, '9999');
select pg_temp.check((transfer('bob@test.cg', 1000, '9999')->'pin'->>'locked_until') is not null, 'blocage via transferts');
select pg_temp.check(not (transfer('bob@test.cg', 1000, '1111')->>'ok')::boolean, 'transfert bloqué même avec bon PIN');
