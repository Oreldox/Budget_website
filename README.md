# 💰 Site Budget DSI

Plateforme de gestion et supervision du budget d'une Direction des Systèmes d'Information (DSI).

## 🚀 Fonctionnalités

### ✅ Implémenté
- 🔐 **Authentification** : Système complet avec NextAuth.js
- 👥 **Gestion des utilisateurs** : Création, modification, activation/désactivation
- 🏢 **Organisations** : Multi-tenancy avec système d'invitation par code
- 📊 **Cockpit** : Vue d'ensemble du budget avec graphiques et KPIs
- 📄 **Factures** : Import, suivi, pointage et gestion complète
- 📑 **Contrats** : Gestion des contrats fournisseurs
- 💵 **Lignes budgétaires** : Structure budgétaire par type et domaine
- 📈 **Rapports** : Tableaux de bord et statistiques
- 🔍 **Recherche globale** : Recherche dans toutes les entités
- 📤 **Export** : Export Excel des données
- 🎨 **Interface moderne** : UI/UX optimisée avec Tailwind et shadcn/ui

### 🎯 Rôles utilisateurs
- **Super Admin** : Gestion globale de toutes les organisations
- **Admin** : Gestion de son organisation et utilisateurs
- **User** : Utilisation complète des fonctionnalités
- **Viewer** : Consultation en lecture seule

## 📋 Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou pnpm

## 🛠️ Installation

### 1. Cloner le projet

```bash
cd site_budget
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer la base de données

Créer une base de données PostgreSQL :

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE budget_dsi;
```

### 4. Configurer les variables d'environnement

Copier le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Modifier le fichier `.env` avec vos informations :

```env
DATABASE_URL="postgresql://postgres:votre_mot_de_passe@localhost:5432/budget_dsi?schema=public"
NEXTAUTH_SECRET="générer_avec_openssl_rand_base64_32"
NEXTAUTH_URL="http://localhost:3000"
```

Pour générer un secret sécurisé :
```bash
openssl rand -base64 32
```

### 5. Initialiser la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Pousser le schéma vers la base de données
npx prisma db push

# Remplir la base avec des données de démo
npm run db:seed
```

### 6. Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 👤 Comptes de démonstration

Après le seeding, vous pouvez vous connecter avec :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Super Admin | admin@budget-dsi.fr | admin123 |
| Admin Org | admin@demo-dsi.fr | admin123 |
| Utilisateur | user@demo-dsi.fr | user123 |
| Lecteur | viewer@demo-dsi.fr | viewer123 |

## 📁 Structure du projet

```
site_budget/
├── app/                      # Routes Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/            # Authentification
│   │   ├── users/           # Gestion utilisateurs
│   │   ├── organizations/   # Gestion organisations
│   │   ├── invoices/        # Gestion factures
│   │   ├── contracts/       # Gestion contrats
│   │   └── budget-lines/    # Lignes budgétaires
│   ├── admin/               # Pages administration
│   ├── cockpit/             # Dashboard principal
│   ├── factures/            # Gestion factures
│   ├── contrats/            # Gestion contrats
│   ├── login/               # Page de connexion
│   └── ...                  # Autres pages
├── components/              # Composants React
│   ├── ui/                  # Composants UI (shadcn/ui)
│   ├── layout/              # Layout components
│   └── drawers/             # Drawers/Modals
├── lib/                     # Utilitaires et configuration
│   ├── auth.ts             # Configuration NextAuth
│   ├── prisma.ts           # Client Prisma
│   └── types.ts            # Types TypeScript
├── prisma/                  # Configuration Prisma
│   ├── schema.prisma       # Schéma de base de données
│   └── seed.ts             # Script de seeding
└── styles/                  # Styles globaux
```

## 🗄️ Structure de la base de données

### Tables principales :
- **User** : Utilisateurs de la plateforme
- **Organization** : Organisations (multi-tenancy)
- **BudgetType** : Types de budget (Logiciels, Infrastructure, etc.)
- **BudgetStructureDomain** : Domaines (Opérations, Développement, etc.)
- **BudgetLine** : Lignes budgétaires
- **Contract** : Contrats fournisseurs
- **Invoice** : Factures
- **AuditLog** : Journal d'audit

## 🔧 Commandes utiles

```bash
# Développement
npm run dev                  # Lancer en mode développement
npm run build               # Build de production
npm run start               # Lancer en production

# Base de données
npm run db:push             # Pousser le schéma sans migration
npm run db:migrate          # Créer une migration
npm run db:studio           # Ouvrir Prisma Studio
npm run db:seed             # Remplir avec des données de démo

# Autres
npm run lint                # Linter le code
```

## 🎨 Technologies utilisées

- **Framework** : Next.js 15 (App Router)
- **Base de données** : PostgreSQL + Prisma ORM
- **Authentification** : NextAuth.js v5
- **UI** : Tailwind CSS + shadcn/ui
- **Validation** : Zod
- **Charts** : Recharts
- **Export** : XLSX

## 🚀 Déploiement

### Vercel (Recommandé)

1. Push le code sur GitHub
2. Connecter le repo sur [Vercel](https://vercel.com)
3. Configurer les variables d'environnement
4. Déployer !

### Autres plateformes

L'application peut être déployée sur toute plateforme supportant Next.js :
- Railway
- Render
- DigitalOcean App Platform
- AWS, GCP, Azure

**Important** : Assurez-vous d'avoir une base PostgreSQL accessible et configurez correctement `DATABASE_URL`.

## 📝 Notes importantes

### Système d'organisations

- Un **Super Admin** (sans organisation) peut créer et gérer toutes les organisations
- Un **Admin d'organisation** ne peut gérer que son organisation et ses utilisateurs
- Chaque organisation est isolée (les données ne sont pas partagées)
- Un code d'invitation unique permet aux utilisateurs de rejoindre une organisation

### Sécurité

- Les mots de passe sont hashés avec bcrypt
- Les sessions sont gérées par JWT
- Validation côté serveur avec Zod
- Protection CSRF intégrée
- Middleware de protection des routes

### Performance

- Pagination des listes
- Lazy loading des données
- Optimistic UI updates
- Caching des données

## 🤝 Support

Pour toute question ou problème :
1. Vérifier les logs de l'application
2. Consulter la documentation Prisma/Next.js
3. Ouvrir une issue GitHub

## 📄 Licence

Propriétaire - Tous droits réservés

---

Développé avec ❤️ pour une meilleure gestion budgétaire DSI
