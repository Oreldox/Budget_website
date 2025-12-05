# 🐳 Guide de Déploiement Docker

## ✅ Prérequis corrigés

Tous les problèmes suivants ont été corrigés :
- ✅ Dossier `prisma` maintenant correctement copié dans l'image Docker
- ✅ Dossier `public` créé
- ✅ Gestion SQLite sans migrations configurée
- ✅ Scripts Prisma inclus dans l'image

## 🚀 Déploiement rapide

### 1. Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.docker .env

# IMPORTANT : Modifier le NEXTAUTH_SECRET
# Générer un secret aléatoire :
openssl rand -base64 32
```

Éditez le fichier `.env` et remplacez :
```
NEXTAUTH_SECRET=votre_secret_généré_ci_dessus
NEXTAUTH_URL=http://votre-domaine.com  # ou http://localhost:3000
```

### 2. Build et démarrage

```bash
# Build de l'image Docker
docker-compose build

# Démarrer l'application
docker-compose up -d

# Vérifier les logs
docker-compose logs -f app
```

### 3. Accéder à l'application

L'application sera accessible sur : `http://localhost:3000`

## 📋 Commandes utiles

```bash
# Arrêter l'application
docker-compose down

# Arrêter et supprimer les volumes (⚠️ supprime la base de données)
docker-compose down -v

# Reconstruire l'image
docker-compose build --no-cache

# Voir les logs en temps réel
docker-compose logs -f app

# Accéder au shell du conteneur
docker-compose exec app sh

# Redémarrer uniquement l'application
docker-compose restart app
```

## 🗄️ Gestion de la base de données

### Backup de la base SQLite

```bash
# Créer un backup
docker-compose exec app cp /app/data/budget.db /app/data/budget.db.backup

# Copier le backup vers l'hôte
docker cp budget_app:/app/data/budget.db ./backup-$(date +%Y%m%d).db
```

### Restaurer un backup

```bash
# Arrêter l'application
docker-compose down

# Copier le backup vers le volume
docker run --rm -v site_budget_sqlite_data:/data -v $(pwd):/backup alpine \
  cp /backup/backup-20231201.db /data/budget.db

# Redémarrer
docker-compose up -d
```

### Seed initial de données

```bash
# Exécuter le seed
docker-compose exec app npx tsx prisma/seed.ts
```

## 🔧 Dépannage

### Le conteneur ne démarre pas

```bash
# Vérifier les logs
docker-compose logs app

# Vérifier que le port 3000 n'est pas déjà utilisé
netstat -an | grep 3000
# ou sur Windows
netstat -an | findstr 3000
```

### Problème de permissions

```bash
# Recréer les volumes
docker-compose down -v
docker-compose up -d
```

### Rebuild complet

```bash
# Tout nettoyer et recommencer
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 🌐 Déploiement en production

### Variables d'environnement importantes

```env
NODE_ENV=production
NEXTAUTH_URL=https://votre-domaine.com
NEXTAUTH_SECRET=un_secret_très_long_et_aléatoire_minimum_32_caractères
DATABASE_URL=file:/app/data/budget.db
```

### Avec reverse proxy (Nginx, Traefik, etc.)

Si vous utilisez un reverse proxy, configurez-le pour :
- Pointer vers `http://localhost:3000` (ou le port configuré)
- Transmettre les headers `X-Forwarded-*`
- Activer HTTPS

### Avec un domaine personnalisé

Modifiez `.env` :
```env
NEXTAUTH_URL=https://budget.votre-domaine.com
APP_PORT=3000
```

Configurez votre reverse proxy ou DNS pour pointer vers votre serveur.

## 📊 Monitoring

### Vérifier la santé du conteneur

```bash
# Status des conteneurs
docker-compose ps

# Utilisation des ressources
docker stats budget_app

# Espace disque des volumes
docker system df -v
```

## 🔐 Sécurité

### Checklist avant production

- [ ] `NEXTAUTH_SECRET` changé et complexe (min 32 caractères)
- [ ] `NEXTAUTH_URL` configuré avec le bon domaine
- [ ] HTTPS activé (via reverse proxy)
- [ ] Backups réguliers configurés
- [ ] Firewall configuré pour limiter l'accès
- [ ] Logs surveillés

## 📦 Mise à jour de l'application

```bash
# 1. Backup de la base de données
docker cp budget_app:/app/data/budget.db ./backup-before-update.db

# 2. Arrêter l'application
docker-compose down

# 3. Pull les dernières modifications (si depuis Git)
git pull

# 4. Rebuild
docker-compose build --no-cache

# 5. Redémarrer
docker-compose up -d

# 6. Vérifier les logs
docker-compose logs -f app
```

## ❓ Support

En cas de problème :
1. Vérifiez les logs : `docker-compose logs -f app`
2. Vérifiez la configuration : `cat .env`
3. Vérifiez que les volumes sont montés : `docker volume ls`
4. Testez la connexion : `curl http://localhost:3000`
