# 📝 Changelog - Configuration Docker PostgreSQL

## ✅ Tous les correctifs appliqués

### 🐳 Dockerfile

**Modifications :**

1. **Ligne 8 : Copie du dossier prisma avant npm ci**
   ```dockerfile
   COPY prisma ./prisma
   RUN npm ci --legacy-peer-deps
   ```
   → Permet à Prisma de générer le client pendant l'installation

2. **Lignes 21-24 : Ajout de DATABASE_URL pour le build**
   ```dockerfile
   ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
   ENV DATABASE_URL=$DATABASE_URL
   ```
   → Évite l'erreur "DATABASE_URL not found" pendant le build

### 🔧 Configuration

**Fichiers modifiés :**

1. **`prisma/schema.prisma`**
   ```prisma
   datasource db {
     provider = "postgresql"  // Changé de "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. **`.env`**
   ```env
   # IMPORTANT: Pas de guillemets !
   DATABASE_URL=postgresql://budget_user:VotreMotDePasse@localhost:5432/budget_db
   ```

3. **`.dockerignore`**
   - Corrigé pour NE PAS bloquer le dossier `prisma/`
   - Bloque uniquement les fichiers `*.db`

4. **`docker-entrypoint.sh`**
   - Gestion améliorée de SQLite ET PostgreSQL
   - Fallback `prisma db push` si pas de migrations

### 🐘 PostgreSQL

**Fichiers créés :**

1. **`docker-compose.postgres.yml`**
   - Service PostgreSQL 16 Alpine
   - Healthcheck pour attendre que PostgreSQL soit prêt
   - Volumes persistants

2. **`.env.postgres`**
   - Template de configuration PostgreSQL
   - Variables pour docker-compose

### 🐛 Corrections de bugs

**1. useSearchParams() - Suspense boundary manquante**

Fichiers créés/modifiés :
- `app/factures/FacturesContent.tsx` (nouveau) - Wrapper avec Suspense
- `app/factures/FacturesPageContent.tsx` (renommé depuis page.tsx)
- `app/factures/page.tsx` (simplifié)

**Solution :**
```tsx
// page.tsx
import FacturesContent from './FacturesContent'
export default function Page() {
  return <FacturesContent />
}

// FacturesContent.tsx
import { Suspense } from 'react'
export default function FacturesContent() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <FacturesPage />
    </Suspense>
  )
}
```

**2. Propriété `isCredit` manquante dans type Invoice**

Fichier modifié : `lib/types.ts`
```typescript
export interface Invoice {
  // ...
  isCredit?: boolean  // Ajouté
  // ...
}
```

**3. MainLayout ne supporte pas les props title/description**

Fichier modifié : `app/bons-commande/page.tsx`
```tsx
// Avant
<MainLayout title="..." description="...">

// Après
<MainLayout>
  <div className="mb-6">
    <h1>Titre</h1>
    <p>Description</p>
  </div>
```

**4. Types manquants dans app/imports/page.tsx**

Ajouté :
```typescript
interface ImportHistoryItem {
  id: string
  filename: string
  type: ImportType
  status: 'success' | 'partial' | 'error'
  linesCount: number
  errorsCount: number
  date: string
  errors?: string[]
}
```

**5. Vérification nullité manquante dans app/services/page.tsx**

Corrigé :
```tsx
// Avant
{pole._count.budgetLines}

// Après
{pole._count?.budgetLines || 0}
```

### 📚 Documentation

**Fichiers créés :**

1. **`DEPLOIEMENT_DOCKER.md`**
   - Guide complet Docker SQLite
   - Commandes utiles
   - Dépannage

2. **`DEPLOIEMENT_POSTGRESQL.md`**
   - Guide complet PostgreSQL
   - Migration depuis SQLite
   - Backups et restore
   - Commandes psql

3. **`CORRECTIFS_DOCKER.md`**
   - Liste de tous les problèmes corrigés
   - Fichiers modifiés

4. **`CORRECTIFS_POSTGRESQL.md`**
   - Détails des changements PostgreSQL
   - Comparaison SQLite vs PostgreSQL

5. **`test-docker.sh`**
   - Script de validation automatique
   - Vérifie que tout est OK avant le build

6. **`validate-docker-setup.sh`**
   - Validation de la configuration Docker
   - Checklist de prérequis

7. **`CHANGELOG_DOCKER.md`**
   - Ce fichier

### 🎯 Résumé des erreurs corrigées

| Erreur | Fichier | Status |
|--------|---------|--------|
| ❌ DATABASE_URL not found | Dockerfile | ✅ Corrigé |
| ❌ prisma/ bloqué dans .dockerignore | .dockerignore | ✅ Corrigé |
| ❌ Dossier public/ manquant | - | ✅ Créé |
| ❌ Scripts .ts bloqués | .dockerignore | ✅ Corrigé |
| ❌ SQLite sans migrations | docker-entrypoint.sh | ✅ Corrigé |
| ❌ Routes API Next.js 15 | 4 fichiers route.ts | ✅ Corrigé |
| ❌ MainLayout props invalides | app/bons-commande/page.tsx | ✅ Corrigé |
| ❌ Type Invoice.isCredit manquant | lib/types.ts | ✅ Corrigé |
| ❌ ImportHistoryItem undefined | app/imports/page.tsx | ✅ Corrigé |
| ❌ Nullité pole._count | app/services/page.tsx | ✅ Corrigé |
| ❌ useSearchParams() Suspense | app/factures/*.tsx | ✅ Corrigé |
| ❌ Prisma non copié avant npm ci | Dockerfile | ✅ Corrigé |

### 📊 État final

**Configuration supportée :**

| Base de données | Fichier docker-compose | Provider Prisma | Status |
|----------------|----------------------|-----------------|--------|
| SQLite | `docker-compose.yml` | `sqlite` | ✅ Fonctionnel |
| PostgreSQL | `docker-compose.postgres.yml` | `postgresql` | ✅ Fonctionnel |

**Commandes de test :**

```bash
# Validation complète
bash test-docker.sh

# Validation Docker
bash validate-docker-setup.sh

# Validation Prisma
npx prisma validate

# Validation TypeScript
npx tsc --noEmit
```

### 🚀 Instructions de déploiement

**Avec SQLite (simple) :**
```bash
cp .env.docker .env
# Éditer .env et changer NEXTAUTH_SECRET
docker-compose build
docker-compose up -d
```

**Avec PostgreSQL (recommandé production) :**
```bash
cp .env.postgres .env
# Éditer .env et changer les mots de passe
docker-compose -f docker-compose.postgres.yml build
docker-compose -f docker-compose.postgres.yml up -d
```

### ✅ Checklist finale

Avant de déployer, vérifiez :

- [ ] `bash test-docker.sh` passe sans erreur
- [ ] `.env` configuré avec vos credentials
- [ ] `NEXTAUTH_SECRET` changé (min 32 caractères)
- [ ] Pas de guillemets autour de `DATABASE_URL`
- [ ] Port 3000 disponible (ou changez `APP_PORT`)
- [ ] Docker et docker-compose installés

### 📅 Historique

**2025-12-05**
- ✅ Configuration Docker complète (SQLite + PostgreSQL)
- ✅ Correction de tous les bugs TypeScript
- ✅ Correction des routes API Next.js 15
- ✅ Documentation complète
- ✅ Scripts de validation

---

**Projet prêt pour le déploiement ! 🚀**
