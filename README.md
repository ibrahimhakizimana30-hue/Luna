# Luna 🌙 - Application de Paiement Mobile

## 📱 Description

Luna est une application complète de paiement mobile, messagerie, appels et épargne conçue pour simplifier la vie financière des utilisateurs.

## ✨ Fonctionnalités

### 💰 Transactions
- Envoi/réception d'argent (Euro, FCFA)
- Support crypto-monnaie (Bitcoin, Ethereum, USDT, BNB)
- Mobile Money & Airtel Money (+242)
- Historique complet des transactions
- Transactions offline avec synchronisation

### 💬 Messagerie
- Chat en temps réel
- Notifications push
- Support offline
- Envoi de messages groupés

### 📞 Appels
- Appels audio et vidéo
- Historique d'appels
- Qualité HD

### 🐷 Épargne
- Épargne automatique (quotidienne, hebdomadaire, mensuelle)
- Verrouillage personnalisable de l'épargne
- Suivi des objectifs
- Intérêts sur épargne (3-5% selon plan)

### 🔐 Sécurité
- Vérification KYC complète
- Code PIN à 4 chiffres
- Empreinte digitale
- Chiffrement des données

### 🎁 Période d'essai
- 7 jours gratuits à l'inscription
- Accès complet à toutes les fonctionnalités
- Aucune carte bancaire requise

## 💰 Plans et Tarification

| Plan | Prix/Mois | Frais Transaction | Limite Mensuelle |
|------|-----------|------------------|------------------|
| **Gratuit** | 0 FCFA | 2.5% | 50,000 FCFA |
| **Premium** | 2,500 FCFA | 1.5% | 500,000 FCFA |
| **VIP** | 5,000 FCFA | 0.5% | Illimité |

## 🌐 Mise en ligne

👉 Suivez **[MISE_EN_LIGNE.md](./MISE_EN_LIGNE.md)** pour brancher Luna sur un vrai serveur
(Supabase) et la publier. Sans serveur configuré, l'application démarre en **mode démo**.

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- pnpm
- React 18.3.1

### Installation

```bash
# Installer les dépendances
pnpm install

# (Optionnel) brancher le serveur : copier .env.example en .env et remplir les clés
cp .env.example .env

# Lancer en mode développement
pnpm run dev
```

## 📂 Structure du Projet

```
src/
├── app/
│   ├── App.tsx                 # Composant principal
│   ├── components/
│   │   ├── KYCVerification.tsx     # Vérification identité
│   │   ├── PinSetup.tsx            # Configuration PIN
│   │   ├── BiometricSetup.tsx      # Configuration empreinte
│   │   ├── SignupLogin.tsx         # Inscription/Connexion
│   │   ├── TransactionsTab.tsx     # Gestion transactions
│   │   ├── MessagesTab.tsx         # Messagerie
│   │   ├── CallsTab.tsx            # Appels
│   │   ├── SavingsAccount.tsx      # Compte d'épargne
│   │   ├── SubscriptionPlans.tsx   # Plans d'abonnement
│   │   └── ...
│   └── styles/
│       ├── fonts.css
│       └── theme.css
```

## 🎨 Technologies Utilisées

- **Frontend** : React 18, TypeScript
- **Styling** : Tailwind CSS v4
- **Icons** : Lucide React
- **Animations** : Motion (Framer Motion)
- **Forms** : React Hook Form
- **State** : React Hooks + LocalStorage

## 📊 Monétisation

Luna génère des revenus via :

1. **Frais de transaction** (0.5% - 2.5%)
2. **Abonnements Premium/VIP**
3. **Services additionnels** (retraits, transferts internationaux)

Voir **[MONETIZATION_GUIDE.md](./MONETIZATION_GUIDE.md)** pour plus de détails.

## 📤 Publication Play Store

Voir **[PLAY_STORE_GUIDE.md](./PLAY_STORE_GUIDE.md)** pour le guide complet de publication.

## 🔒 Sécurité

- Authentification à 2 facteurs (PIN + Empreinte)
- Vérification KYC obligatoire
- Chiffrement des données sensibles
- Transactions sécurisées

## 📈 Roadmap

- [x] Système de transactions multi-devises
- [x] Messagerie et appels intégrés
- [x] Compte d'épargne automatique
- [x] Vérification KYC
- [x] Période d'essai 7 jours
- [x] Plans d'abonnement
- [ ] Publication Play Store
- [ ] Intégration Google Play Billing
- [ ] Notifications push
- [ ] Carte virtuelle Luna
- [ ] Prêts instantanés

## 🤝 Support

Pour toute question ou problème :
- Email : support@luna-app.com
- WhatsApp : +242 XXX XXX XXX

## 📄 Licence

Propriétaire - Tous droits réservés © 2026 Luna App

## 🌟 Crédits

Développé avec ❤️ pour simplifier la vie financière au Congo 🇨🇬

---

**Luna 🌙 - Votre partenaire financier de confiance**
