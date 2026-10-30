# 🚀 Mettre Luna en ligne (version test réelle)

Ce guide branche Luna sur un vrai serveur (Supabase) et la publie sur internet.
Il reste 2 étapes : environ 15 minutes. Aucune compétence en programmation n'est nécessaire.

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

## ✅ Étapes 1 et 2 — Projet Supabase et base de données (faites)

Le projet Supabase **Luna** (région Irlande, plan gratuit) est créé et la base de
données est installée (fichiers `supabase/migrations/0001` à `0003`). Les règles
de sécurité ont été vérifiées sur le projet réel.

L'adresse du serveur et sa clé publique sont déjà dans `.env.production` :
vous n'avez **rien à saisir** dans Netlify.

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

## Étape 4 — Publier l'application sur Netlify (gratuit)

1. Allez sur **https://netlify.com** et connectez-vous avec votre compte GitHub.
2. **Add new site** → **Import an existing project** → **GitHub** → choisissez **Luna**.
3. Netlify lit automatiquement `netlify.toml` (commande `pnpm build`, dossier `dist`).
   Ne changez aucun réglage.
4. Cliquez sur **Deploy**. Après 1 à 2 minutes, Netlify vous donne une adresse
   du type `https://luna-xxxx.netlify.app`.
5. Dans Supabase, menu **Authentication** → **URL Configuration** : mettez cette
   adresse dans **Site URL**.

Ouvrez l'adresse sur votre téléphone : Luna fonctionne. 🎉

> Pour revenir au **mode démo** (données simulées sur le téléphone), supprimez
> le fichier `.env.production`.

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

## Administration des pièces d'identité

Les comptes administrateurs voient un bouton bouclier (🛡) en haut de l'accueil.
Il ouvre la liste des demandes de vérification, avec les photos, et permet de
les **valider** ou de les **refuser**.

Pour nommer un autre administrateur (éditeur SQL de Supabase) :

```sql
insert into private.admins (user_id)
  select id from public.profiles where contact = 'adresse@exemple.com';
```

## Emails de connexion en français

Le modèle `supabase/templates/code_connexion.html` affiche le code à 6 chiffres.
Dans Supabase : **Authentication → Emails → Templates**, coller ce modèle dans
**Confirm signup** et dans **Magic Link**, avec pour sujet « Votre code Luna ».

## Pages légales

`public/conditions.html` et `public/confidentialite.html` sont des **versions
provisoires** à faire relire par un juriste avant l'ouverture au public.
