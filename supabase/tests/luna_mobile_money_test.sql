\set ON_ERROR_STOP 1
-- Tests : paiements Mobile Money déclarés
reset role;
insert into auth.users (id, email) values ('e1111111-1111-1111-1111-111111111111', 'eve@test.cg');
create function pg_temp.check3(cond boolean, label text) returns void language plpgsql as
$$ begin if cond then raise notice 'PASS %', label; else raise exception 'FAIL %', label; end if; end $$;
create function pg_temp.fails3(sql text, expected text, label text) returns void language plpgsql as
$$ begin execute sql; raise exception 'FAIL % (aucune erreur)', label;
   exception when others then
     if sqlerrm like 'FAIL%' then raise; end if;
     if sqlerrm ilike '%' || expected || '%' then raise notice 'PASS % -> %', label, sqlerrm;
     else raise exception 'FAIL % : erreur inattendue %', label, sqlerrm; end if; end $$;
grant execute on all functions in schema pg_temp to authenticated;

set role authenticated; set request.jwt.claim.sub = 'e1111111-1111-1111-1111-111111111111';
select declare_mobile_money_payment('mtn', '06 123 4567', 5000, '  Loyer  ');
select pg_temp.check3((select recipient_phone = '+242061234567' and note = 'Loyer' from my_mobile_money_payments()), 'paiement MTN enregistré, numéro et note normalisés');
select declare_mobile_money_payment('airtel', '+242 05 111 2233', 2500);
select pg_temp.check3((select count(*) from my_mobile_money_payments()) = 2, 'historique : 2 paiements');
select pg_temp.fails3($$select declare_mobile_money_payment('orange', '061234567', 100)$$, 'Opérateur inconnu', 'opérateur inconnu refusé');
select pg_temp.fails3($$select declare_mobile_money_payment('mtn', '12345', 100)$$, 'Numéro invalide', 'numéro invalide refusé');
select pg_temp.fails3($$select declare_mobile_money_payment('mtn', 'eve@test.cg', 100)$$, 'Numéro invalide', 'email refusé');
select pg_temp.fails3($$select declare_mobile_money_payment('mtn', '061234567', 0)$$, 'Montant invalide', 'montant nul refusé');
select pg_temp.fails3($$select declare_mobile_money_payment('mtn', '061234567', 100, repeat('a', 141))$$, 'trop longue', 'note trop longue refusée');
select pg_temp.fails3($$insert into mobile_money_payments (user_id, operator, recipient_phone, amount) values (auth.uid(), 'mtn', '+242061234567', 1)$$, 'permission denied', 'écriture directe interdite');

-- Un autre utilisateur ne voit pas ces paiements
reset role; set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select pg_temp.check3((select count(*) from my_mobile_money_payments()) = 0, 'un tiers ne voit pas les paiements');
select pg_temp.check3((select count(*) from mobile_money_payments) = 0, 'un tiers ne lit pas la table');

reset role; set role anon; set request.jwt.claim.sub = '';
select pg_temp.fails3($$select declare_mobile_money_payment('mtn', '061234567', 100)$$, 'permission denied', 'visiteur ne peut pas déclarer');
