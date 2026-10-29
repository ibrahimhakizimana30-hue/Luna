-- Luna : réglages de sécurité complémentaires (déjà appliqués au projet Supabase)

-- Le service de connexion de Supabase crée les comptes : il doit pouvoir
-- lancer la création automatique du profil et du portefeuille.
grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;

-- Chemin de recherche fixe pour les petites fonctions internes
-- (recommandation du conseiller de sécurité Supabase).
alter function private.test_credit() set search_path = '';
alter function private.plan_fee_percent(text) set search_path = '';
alter function private.plan_monthly_limit(text) set search_path = '';
alter function private.normalize_contact(text) set search_path = '';
