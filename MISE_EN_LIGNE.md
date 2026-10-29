# 🚀 Mettre Luna en ligne (version test réelle)

Ce guide branche Luna sur un vrai serveur (Supabase) et la publie sur internet.
Comptes 30 à 45 minutes. Aucune compétence en programmation n'est nécessaire.

> ⚠️ **Version test** : chaque nouveau compte reçoit **50 000 FCFA fictifs** pour
> essayer les transferts entre utilisateurs Luna. Aucun argent réel ne circule.
> Mobile Money, Airtel Money et crypto ne sont pas encore branchés (voir la fin du guide).

---

## Ce qui fonctionne en version test

| Fonction | État |
|---|---|
| Inscription / connexion par code reçu par **email** | ✅ Réel |
| Inscription / connexion par code reçu par **SMS** | ✅ Réel (fournisseur SMS payant à activer, étape 3) |
| Code PIN vérifié par le serveur, blocage après 5 erreurs | ✅ Réel |
| « Code PIN oublié ? » : nouveau code par SMS/email puis nouveau PIN | ✅ Réel |
| Empreinte digitale (capteur du téléphone) | ✅ Réel (navigateur en HTTPS) |
| Solde, transferts entre utilisateurs Luna, frais, limites mensuelles | ✅ Réel (argent fictif) |
| Chaque transfert confirmé par le code PIN | ✅ Réel |
| Période d'essai de 7 jours | ✅ Réel |
| Vérification d'identité (KYC) : envoi des documents, validation par vous | ✅ Réel |
| Messages, appels, épargne | 🟡 Démonstration (données fictives) |
| Mobile Money, Airtel Money, crypto | ❌ Nécessite licence et accords opérateurs |

---

## Étape 1 — Créer le projet Supabase (gratuit)

1. Allez sur **https://supabase.com** et créez un compte.
2. Cliquez sur **New project**.
3. Donnez-lui un nom (ex. `luna`), choisissez un **mot de passe de base de données**
   (notez-le en lieu sûr) et la région **West EU (Paris)** ou la plus proche.
4. Attendez 1 à 2 minutes que le projet soit prêt.

## Étape 2 — Créer la base de données

1. Dans le menu de gauche, ouvrez **SQL Editor**.
2. Cliquez sur **New query**.
3. Ouvrez le fichier [`supabase/migrations/0001_luna_init.sql`](supabase/migrations/0001_luna_init.sql)
   sur GitHub, copiez **tout** son contenu, collez-le dans l'éditeur, puis cliquez sur **Run**.
   Le message « Success. No rows returned » doit s'afficher.
4. Recommencez avec [`supabase/migrations/0002_luna_storage.sql`](supabase/migrations/0002_luna_storage.sql).

## Étape 3 — Activer les codes de connexion

### Par email (gratuit)

1. Menu **Authentication** → **Sign In / Providers** → **Email** : vérifiez que c'est activé.
   Réglez **Email OTP Length** sur **6**.
2. Menu **Authentication** → **Emails** (ou **Email Templates**) → modèle **Magic Link** :
   remplacez le contenu par ce texte, pour que l'utilisateur reçoive un **code** et non un lien :

   ```html
   <h2>Votre code Luna</h2>
   <p>Entrez ce code dans l'application : <strong>{{ .Token }}</strong></p>
   <p>Il expire dans 1 heure. Si vous n'avez rien demandé, ignorez cet email.</p>
   ```

3. Faites de même pour le modèle **Confirm signup**.

> ℹ️ L'envoi d'emails gratuit de Supabase est limité à quelques messages par heure.
> Pour de vrais utilisateurs, branchez un service d'envoi (Resend, Brevo…) dans
> **Authentication → Emails → SMTP Settings**.

### Par SMS (payant)

1. Créez un compte chez un fournisseur SMS pris en charge (**Twilio**, Vonage, MessageBird ou TextLocal).
2. Menu **Authentication** → **Sign In / Providers** → **Phone** : activez-le et collez
   les identifiants du fournisseur.
3. Sans cette étape, seule l'inscription par email fonctionne.

## Étape 4 — Récupérer les 2 clés du projet

Menu **Project Settings** → **API** (ou **Data API**) :

- **Project URL** (ressemble à `https://abcdefgh.supabase.co`)
- **anon public key** (longue suite de caractères)

Ces deux valeurs peuvent être visibles dans l'application : c'est prévu. Les règles
de sécurité sont dans la base de données. **Ne partagez jamais la clé `service_role`.**

## Étape 5 — Publier l'application sur Netlify (gratuit)

1. Allez sur **https://netlify.com** et connectez-vous avec votre compte GitHub.
2. **Add new site** → **Import an existing project** → **GitHub** → choisissez **Luna**.
3. Netlify lit automatiquement `netlify.toml` (commande `pnpm build`, dossier `dist`).
4. Avant de lancer, ouvrez **Environment variables** et ajoutez :
   - `VITE_SUPABASE_URL` = votre Project URL
   - `VITE_SUPABASE_ANON_KEY` = votre anon public key
5. Cliquez sur **Deploy**. Après 1 à 2 minutes, Netlify vous donne une adresse
   du type `https://luna-xxxx.netlify.app`.
6. Dans Supabase, menu **Authentication** → **URL Configuration** : mettez cette
   adresse dans **Site URL**.

Ouvrez l'adresse sur votre téléphone : Luna fonctionne. 🎉

> Sans les deux variables de l'étape 4, l'application démarre en **mode démo**
> (données simulées sur le téléphone), comme dans Figma Make.

---

## Gérer Luna au quotidien

### Valider une vérification d'identité (KYC)

1. **Storage** → dossier **kyc** : chaque utilisateur a un dossier avec ses photos
   (recto, verso, selfie). Vérifiez-les.
2. **SQL Editor**, lancez :

   ```sql
   select k.id, p.contact, k.doc_type, k.created_at
   from kyc_submissions k join profiles p on p.id = k.user_id
   where k.status = 'pending'
   order by k.created_at;
   ```

3. Pour **approuver** (remplacez par l'`id` de la ligne) :

   ```sql
   select private.review_kyc('ID-DE-LA-DEMANDE', true);
   ```

   Pour **refuser**, remplacez `true` par `false`. La personne pourra renvoyer ses documents.

### Changer le plan d'un utilisateur (Premium, VIP)

```sql
update profiles set plan = 'premium' where contact = '+242061234567';
```

(Le paiement des abonnements n'est pas encore automatisé.)

### Avant d'utiliser de l'argent réel

Supprimez le crédit de test offert à l'inscription :

```sql
create or replace function private.test_credit() returns bigint
language sql immutable as $$ select 0::bigint $$;
```

---

## Ce qu'il reste pour une version commerciale

1. **Licence et conformité** : autorisation d'émission de monnaie électronique ou
   partenariat avec un établissement agréé (Banque centrale / COBAC), conformité
   KYC/anti-blanchiment, déclaration de protection des données. Consultez un avocat fintech.
2. **Accords opérateurs** : contrats marchands MTN Mobile Money et Airtel Money
   pour recevoir leurs clés d'API (dépôts et retraits réels).
3. **Messages et appels** réels (messagerie en temps réel, appels via WebRTC).
4. **Épargne** enregistrée sur le serveur.
5. **Notifications** (validation KYC, argent reçu).
6. **Application Android** (voir `BRIEF_DEVELOPPEUR.md`) : dans une WebView,
   l'empreinte digitale doit passer par l'API biométrique native.

---

## Pour les développeurs

```bash
pnpm install
cp .env.example .env   # puis remplir les 2 clés (sinon : mode démo)
pnpm dev               # lancer en local
pnpm typecheck         # vérifier les types
pnpm build             # compiler pour la production
```

Tests des règles de la base (PostgreSQL 16 local) :

```bash
PGHOST=localhost PGUSER=postgres ./supabase/tests/run.sh
```
