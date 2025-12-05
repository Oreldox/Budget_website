# 🐘 Guide de Déploiement avec PostgreSQL

## ✅ Changements effectués

- ✅ `prisma/schema.prisma` → Provider changé de `sqlite` à `postgresql`
- ✅ `.env` → `DATABASE_URL` configurée pour PostgreSQL
- ✅ `Dockerfile` → Ajout de `DATABASE_URL` dummy pour le build
- ✅ `docker-compose.postgres.yml` → Configuration complète PostgreSQL + App
- ✅ `.env.postgres` → Template de configuration PostgreSQL
- ✅ `app/factures/page.tsx` → Correction erreur Suspense avec `useSearchParams()`

## 🚀 Déploiement rapide

### 1. Copier la configuration PostgreSQL

```bash
cp .env.postgres .env
```

### 2. Éditer les credentials dans `.env`

```env
# Modifiez ces valeurs
POSTGRES_USER=budget_user
POSTGRES_PASSWORD=ChangezCeciParUnMotDePasseSecurise123
POSTGRES_DB=budget_db

# DATABASE_URL doit correspondre
DATABASE_URL=postgresql://budget_user:ChangezCeciParUnMotDePasseSecurise123@postgres:5432/budget_db

# Générez un nouveau NEXTAUTH_SECRET
NEXTAUTH_SECRET=votre_secret_aleatoire_32_caracteres_minimum
```

### 3. Générer un secret NextAuth

```bash
# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Linux/Mac
openssl rand -base64 32
```

### 4. Build et démarrage

```bash
# Build les images
docker-compose -f docker-compose.postgres.yml build

# Démarrer PostgreSQL + App
docker-compose -f docker-compose.postgres.yml up -d

# Vérifier les logs
docker-compose -f docker-compose.postgres.yml logs -f
```

### 5. Vérifier que tout fonctionne

```bash
# Status des conteneurs
docker-compose -f docker-compose.postgres.yml ps

# Logs de l'application
docker-compose -f docker-compose.postgres.yml logs app

# Logs de PostgreSQL
docker-compose -f docker-compose.postgres.yml logs postgres
```

## 📊 Structure de DATABASE_URL PostgreSQL

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

### Exemples selon l'environnement

#### Docker Compose (par défaut)
```env
DATABASE_URL=postgresql://budget_user:password@postgres:5432/budget_db
```
→ `postgres` est le nom du service dans docker-compose.yml

#### Développement local (PostgreSQL installé)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/budget_db
```

#### Serveur externe
```env
DATABASE_URL=postgresql://user:pass@192.168.1.100:5432/mydb
```

#### Production avec SSL
```env
DATABASE_URL=postgresql://user:pass@db.example.com:5432/db?sslmode=require
```

#### Supabase
```env
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

#### Railway / Render
```env
DATABASE_URL=postgresql://user:pass@containers-us-west-xxx.railway.app:5432/railway
```

## 🗄️ Commandes PostgreSQL utiles

### Accéder à PostgreSQL

```bash
# Via psql
docker-compose -f docker-compose.postgres.yml exec postgres psql -U budget_user -d budget_db

# Commandes SQL utiles
\dt          # Lister les tables
\d+ Invoice  # Voir structure d'une table
\l           # Lister les bases de données
\q           # Quitter
```

### Backup et Restore

```bash
# Créer un backup
docker-compose -f docker-compose.postgres.yml exec postgres pg_dump -U budget_user budget_db > backup_$(date +%Y%m%d).sql

# Restaurer un backup
docker-compose -f docker-compose.postgres.yml exec -T postgres psql -U budget_user budget_db < backup_20231201.sql

# Backup avec compression
docker-compose -f docker-compose.postgres.yml exec postgres pg_dump -U budget_user -Fc budget_db > backup.dump
```

### Migrations Prisma

```bash
# Créer une migration
npx prisma migrate dev --name description_changement

# Appliquer les migrations en production
npx prisma migrate deploy

# Voir l'état des migrations
npx prisma migrate status

# Reset la base (⚠️ PERTE DE DONNÉES)
npx prisma migrate reset
```

### Prisma Studio

```bash
# Ouvrir l'interface graphique
npx prisma studio
```

## 🔄 Migration depuis SQLite vers PostgreSQL

Si vous avez déjà des données en SQLite :

### Option 1 : Export/Import manuel

```bash
# 1. Exporter les données depuis SQLite
npx prisma db pull  # Récupère le schéma actuel

# 2. Changer provider dans schema.prisma
# datasource db {
#   provider = "postgresql"
# }

# 3. Créer les tables PostgreSQL
npx prisma migrate dev --name init

# 4. Exporter/Importer les données manuellement via l'interface
```

### Option 2 : Script de migration (recommandé)

```typescript
// scripts/migrate-to-postgres.ts
import { PrismaClient as SqliteClient } from '@prisma/client'
import { PrismaClient as PostgresClient } from '@prisma/client'

const sqlite = new SqliteClient()
const postgres = new PostgresClient()

async function migrate() {
  // Migrer les utilisateurs
  const users = await sqlite.user.findMany()
  for (const user of users) {
    await postgres.user.create({ data: user })
  }

  // Répéter pour chaque table...
}

migrate()
```

## 📋 Variables d'environnement complètes

```env
# ==============================================
# BASE DE DONNÉES - POSTGRESQL
# ==============================================
DATABASE_URL=postgresql://budget_user:VotreMotDePasse@postgres:5432/budget_db

# Credentials PostgreSQL (pour docker-compose)
POSTGRES_USER=budget_user
POSTGRES_PASSWORD=VotreMotDePasse
POSTGRES_DB=budget_db
POSTGRES_PORT=5432

# ==============================================
# NEXTAUTH
# ==============================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_32_caracteres_minimum

# En production avec domaine
# NEXTAUTH_URL=https://budget.votre-domaine.com

# ==============================================
# ENVIRONNEMENT
# ==============================================
NODE_ENV=production
APP_PORT=3000
```

## 🚀 Déploiement en production

### Avec domaine et SSL

```env
# .env.production
DATABASE_URL=postgresql://user:pass@postgres:5432/budget_db
NEXTAUTH_URL=https://budget.votre-domaine.com
NEXTAUTH_SECRET=votre_secret_securise
NODE_ENV=production
```

### Avec reverse proxy (Nginx/Traefik)

Configurez votre reverse proxy pour :
- Pointer vers `http://localhost:3000`
- Transmettre les headers `X-Forwarded-*`
- Activer HTTPS avec Let's Encrypt

Exemple Nginx :
```nginx
server {
    listen 443 ssl;
    server_name budget.example.com;

    ssl_certificate /etc/letsencrypt/live/budget.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/budget.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🛠️ Dépannage

### Erreur : "Connection refused"

```bash
# Vérifier que PostgreSQL est démarré
docker-compose -f docker-compose.postgres.yml ps

# Voir les logs PostgreSQL
docker-compose -f docker-compose.postgres.yml logs postgres

# Redémarrer PostgreSQL
docker-compose -f docker-compose.postgres.yml restart postgres
```

### Erreur : "Password authentication failed"

```bash
# Vérifier que DATABASE_URL correspond aux credentials
cat .env | grep DATABASE_URL
cat .env | grep POSTGRES_

# Recréer les conteneurs
docker-compose -f docker-compose.postgres.yml down -v
docker-compose -f docker-compose.postgres.yml up -d
```

### Erreur : "Database does not exist"

```bash
# Créer la base manuellement
docker-compose -f docker-compose.postgres.yml exec postgres createdb -U budget_user budget_db

# Ou laisser docker-compose la créer au démarrage
docker-compose -f docker-compose.postgres.yml up -d
```

### Performances lentes

```sql
-- Vérifier les connexions actives
SELECT count(*) FROM pg_stat_activity;

-- Voir les requêtes lentes
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 📊 Monitoring

```bash
# Statistiques PostgreSQL
docker-compose -f docker-compose.postgres.yml exec postgres psql -U budget_user -d budget_db -c "SELECT * FROM pg_stat_database WHERE datname='budget_db';"

# Taille de la base
docker-compose -f docker-compose.postgres.yml exec postgres psql -U budget_user -d budget_db -c "SELECT pg_size_pretty(pg_database_size('budget_db'));"

# Espace disque des volumes
docker system df -v
```

## 🔐 Sécurité

### Checklist production

- [ ] Mot de passe PostgreSQL fort et unique
- [ ] `NEXTAUTH_SECRET` changé (min 32 caractères)
- [ ] HTTPS activé via reverse proxy
- [ ] Firewall configuré (port 5432 non exposé publiquement)
- [ ] Backups automatisés configurés
- [ ] Logs surveillés
- [ ] Variables d'environnement sécurisées (pas dans git)

### Backups automatisés

```bash
# Script de backup automatique
#!/bin/bash
# backup-postgres.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
mkdir -p $BACKUP_DIR

docker-compose -f docker-compose.postgres.yml exec -T postgres \
  pg_dump -U budget_user -Fc budget_db > "$BACKUP_DIR/backup_$DATE.dump"

# Garder seulement les 7 derniers backups
ls -t $BACKUP_DIR/backup_*.dump | tail -n +8 | xargs rm -f

echo "Backup créé: backup_$DATE.dump"
```

Ajoutez au crontab :
```bash
# Backup tous les jours à 2h du matin
0 2 * * * /path/to/backup-postgres.sh
```

## ✅ Résumé

Votre application est maintenant configurée pour PostgreSQL ! 🎉

**Commandes essentielles :**
```bash
# Démarrer
docker-compose -f docker-compose.postgres.yml up -d

# Logs
docker-compose -f docker-compose.postgres.yml logs -f

# Arrêter
docker-compose -f docker-compose.postgres.yml down

# Backup
docker-compose -f docker-compose.postgres.yml exec postgres pg_dump -U budget_user budget_db > backup.sql
```

Pour revenir à SQLite, utilisez `docker-compose.yml` au lieu de `docker-compose.postgres.yml`.
