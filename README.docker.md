# 🐳 Guide de déploiement Docker

## Versions utilisées

- **Node.js** : 20.18 (Alpine Linux)
- **Next.js** : 15.1.3
- **React** : 19.0.0
- **PostgreSQL** : 15 (Alpine Linux) - optionnel
- **Nginx** : Alpine Linux - optionnel

## 📁 Fichiers de configuration

### Fichiers Docker
- `Dockerfile` : Image Docker multi-stage optimisée
- `docker-compose.yml` : Configuration avec SQLite (par défaut)
- `docker-compose.postgres.yml` : Configuration avec PostgreSQL
- `docker-entrypoint.sh` : Script de démarrage avec gestion des migrations
- `.dockerignore` : Fichiers exclus du build Docker

### Fichiers de configuration
- `.env.docker` : Variables d'environnement par défaut
- `.env.production.example` : Template de configuration
- `nginx.conf` : Configuration du reverse proxy Nginx

### Fichiers utilitaires
- `Makefile` : Commandes simplifiées (Linux/Mac)
- `DEPLOYMENT.md` : Documentation complète

## 🚀 Démarrage rapide

### Option 1 : SQLite (recommandé pour débuter)

```bash
# Lancer l'application
docker-compose --env-file .env.docker up -d

# Voir les logs en temps réel
docker-compose logs -f app

# Application disponible sur http://localhost:3000
```

### Option 2 : PostgreSQL (recommandé pour production)

```bash
# Modifier le secret dans .env.docker
nano .env.docker

# Lancer avec PostgreSQL
docker-compose -f docker-compose.postgres.yml --env-file .env.docker up -d

# Voir les logs
docker-compose -f docker-compose.postgres.yml logs -f
```

### Option 3 : Avec Makefile (Linux/Mac)

```bash
# Afficher l'aide
make help

# Lancer avec SQLite
make up

# Lancer avec PostgreSQL
make up-postgres

# Lancer avec PostgreSQL + Nginx
make up-nginx

# Voir les logs
make logs

# Arrêter
make down
```

## 🔧 Commandes utiles

### Gestion des conteneurs

```bash
# Reconstruire l'image après modification du code
docker-compose build app

# Redémarrer un conteneur
docker-compose restart app

# Accéder au shell du conteneur
docker-compose exec app sh

# Voir l'utilisation des ressources
docker stats budget_app
```

### Gestion de la base de données

#### SQLite

```bash
# Backup de la base SQLite
docker cp budget_app:/app/data/budget.db ./backup_$(date +%Y%m%d_%H%M%S).db

# Restaurer un backup
docker cp ./backup_20240101_120000.db budget_app:/app/data/budget.db
docker-compose restart app
```

#### PostgreSQL

```bash
# Backup PostgreSQL
docker exec budget_postgres pg_dump -U budget_user budget_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer un backup
cat backup_20240101_120000.sql | docker exec -i budget_postgres psql -U budget_user -d budget_db

# Accéder à psql
docker-compose -f docker-compose.postgres.yml exec postgres psql -U budget_user -d budget_db
```

### Migrations Prisma

```bash
# Exécuter les migrations manuellement
docker-compose exec app npx prisma migrate deploy

# Générer le client Prisma
docker-compose exec app npx prisma generate

# Ouvrir Prisma Studio
docker-compose exec app npx prisma studio
```

### Logs et debugging

```bash
# Voir tous les logs
docker-compose logs

# Logs d'un service spécifique
docker-compose logs app
docker-compose logs postgres

# Suivre les logs en temps réel
docker-compose logs -f app

# Afficher les 100 dernières lignes
docker-compose logs --tail=100 app
```

## 🔐 Sécurité

### Variables d'environnement obligatoires à changer

1. **NEXTAUTH_SECRET** : Secret pour NextAuth
   ```bash
   # Générer un secret aléatoire
   openssl rand -base64 32
   ```

2. **POSTGRES_PASSWORD** (si PostgreSQL)
   ```bash
   # Utiliser un mot de passe fort
   openssl rand -base64 24
   ```

### Fichiers sensibles à ne PAS commiter

- `.env.docker`
- `.env.production`
- `.env.local`
- `prisma/*.db` (base SQLite)

### Recommandations de sécurité

- ✅ Utiliser HTTPS en production
- ✅ Configurer un firewall (ufw, iptables)
- ✅ Mettre à jour régulièrement les images Docker
- ✅ Scanner les vulnérabilités : `docker scan budget_app`
- ✅ Limiter les ressources : CPU/Memory limits dans docker-compose
- ✅ Utiliser des secrets Docker Swarm en production

## 📊 Volumes persistants

### SQLite (docker-compose.yml)
- `sqlite_data` : Base de données SQLite (`/app/data`)
- `app_uploads` : Fichiers uploadés (`/app/public/uploads`)

### PostgreSQL (docker-compose.postgres.yml)
- `postgres_data` : Données PostgreSQL (`/var/lib/postgresql/data`)
- `app_uploads` : Fichiers uploadés (`/app/public/uploads`)

### Gérer les volumes

```bash
# Lister les volumes
docker volume ls

# Inspecter un volume
docker volume inspect budget_sqlite_data

# Sauvegarder un volume
docker run --rm -v budget_sqlite_data:/data -v $(pwd):/backup alpine tar czf /backup/sqlite_backup.tar.gz -C /data .

# Restaurer un volume
docker run --rm -v budget_sqlite_data:/data -v $(pwd):/backup alpine tar xzf /backup/sqlite_backup.tar.gz -C /data

# Supprimer tous les volumes (ATTENTION : perte de données !)
docker-compose down -v
```

## 🐛 Résolution de problèmes

### L'application ne démarre pas

```bash
# Vérifier les logs
docker-compose logs app

# Vérifier l'état des conteneurs
docker-compose ps

# Vérifier la configuration
docker-compose config
```

### Erreur "address already in use"

```bash
# Trouver le processus utilisant le port 3000
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Changer le port dans .env.docker
APP_PORT=3001
```

### Erreur de connexion à PostgreSQL

```bash
# Vérifier que PostgreSQL est prêt
docker-compose -f docker-compose.postgres.yml exec postgres pg_isready

# Vérifier les logs PostgreSQL
docker-compose -f docker-compose.postgres.yml logs postgres

# Attendre 10-15 secondes après docker-compose up
```

### Erreur "no space left on device"

```bash
# Nettoyer les images inutilisées
docker system prune -a

# Nettoyer les volumes inutilisés
docker volume prune

# Voir l'utilisation disque
docker system df
```

### Rebuild complet après modification du code

```bash
# Arrêter et supprimer les conteneurs
docker-compose down

# Rebuild l'image
docker-compose build --no-cache app

# Relancer
docker-compose up -d

# Ou avec Make
make rebuild
```

## 🌐 Production avec Nginx

### Configuration SSL/TLS

1. Obtenir des certificats Let's Encrypt :
   ```bash
   certbot certonly --standalone -d votre-domaine.com
   ```

2. Copier les certificats :
   ```bash
   mkdir -p ssl
   cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem ssl/cert.pem
   cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem ssl/key.pem
   ```

3. Décommenter la configuration HTTPS dans `nginx.conf`

4. Modifier `NEXTAUTH_URL` dans `.env.docker` :
   ```
   NEXTAUTH_URL=https://votre-domaine.com
   ```

5. Lancer avec Nginx :
   ```bash
   docker-compose -f docker-compose.postgres.yml --env-file .env.docker --profile with-nginx up -d
   ```

## 📈 Monitoring

### Voir les ressources utilisées

```bash
# Stats en temps réel
docker stats

# Stats d'un conteneur spécifique
docker stats budget_app

# Utilisation disque
docker system df
```

### Logs structurés

Pour une meilleure gestion des logs en production, considérez :
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana Loki
- Splunk
- Datadog

## 🔄 Mise à jour de l'application

```bash
# 1. Récupérer les dernières modifications
git pull

# 2. Arrêter l'application
docker-compose down

# 3. Rebuild l'image
docker-compose build --no-cache

# 4. Relancer
docker-compose up -d

# 5. Vérifier les logs
docker-compose logs -f app
```

## 🎯 Performance

### Optimisations

1. **Limiter les ressources** (docker-compose.yml) :
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
       reservations:
         cpus: '0.5'
         memory: 512M
   ```

2. **Activer le cache Docker** :
   ```bash
   # Utiliser BuildKit
   DOCKER_BUILDKIT=1 docker-compose build
   ```

3. **Multi-stage builds** : Déjà implémenté dans le Dockerfile

## 📝 Notes importantes

- Le premier build peut prendre 5-10 minutes
- SQLite est suffisant pour < 100 utilisateurs
- PostgreSQL recommandé pour production
- Les migrations Prisma s'exécutent automatiquement au démarrage
- Le mode `standalone` de Next.js réduit la taille de l'image
- Les fichiers statiques sont optimisés automatiquement
