# 🐳 Déploiement Docker - Application de Gestion Budgétaire

## 📋 Prérequis

- Docker (version 20.10+)
- Docker Compose (version 2.0+)

## 🚀 Démarrage rapide

### 1. Configuration

Copiez le fichier d'environnement exemple :

```bash
cp .env.production.example .env.production
```

Modifiez `.env.production` et changez **obligatoirement** :
- `POSTGRES_PASSWORD` : Un mot de passe fort pour la base de données
- `NEXTAUTH_SECRET` : Une chaîne aléatoire de minimum 32 caractères
- `NEXTAUTH_URL` : L'URL de votre application en production

Pour générer un secret aléatoire :
```bash
openssl rand -base64 32
```

### 2. Lancer l'application

**Mode développement avec PostgreSQL :**
```bash
docker-compose up -d
```

**Voir les logs :**
```bash
docker-compose logs -f app
```

**Arrêter l'application :**
```bash
docker-compose down
```

**Arrêter et supprimer les volumes (données perdues) :**
```bash
docker-compose down -v
```

### 3. Accéder à l'application

- Application : http://localhost:3000
- Via Nginx : http://localhost:80

## 🛠️ Configuration avancée

### Utilisation avec un domaine personnalisé

1. Modifiez `nginx.conf` pour ajouter votre nom de domaine
2. Ajoutez vos certificats SSL dans le dossier `ssl/`
3. Décommentez la configuration HTTPS dans `nginx.conf`
4. Modifiez `NEXTAUTH_URL` dans `.env.production` avec votre domaine HTTPS

### Migration depuis SQLite vers PostgreSQL

Si vous utilisiez SQLite en développement :

1. Exportez vos données actuelles
2. Modifiez `prisma/schema.prisma` pour PostgreSQL :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Créez et appliquez une nouvelle migration :

```bash
npx prisma migrate dev --name init_postgres
```

### Backup de la base de données

**Créer un backup :**
```bash
docker exec budget_postgres pg_dump -U budget_user budget_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restaurer un backup :**
```bash
cat backup_YYYYMMDD_HHMMSS.sql | docker exec -i budget_postgres psql -U budget_user -d budget_db
```

## 📦 Structure des conteneurs

### Services

1. **postgres** : Base de données PostgreSQL 15
   - Port : 5432 (interne)
   - Volume : `postgres_data`

2. **app** : Application Next.js
   - Port : 3000
   - Dépend de : postgres

3. **nginx** : Reverse proxy (optionnel)
   - Ports : 80, 443
   - Dépend de : app

### Volumes persistants

- `postgres_data` : Données de la base de données
- `app_uploads` : Fichiers uploadés par les utilisateurs

## 🔧 Commandes utiles

**Reconstruire l'image Docker après modification du code :**
```bash
docker-compose build app
docker-compose up -d app
```

**Exécuter les migrations manuellement :**
```bash
docker-compose exec app npx prisma migrate deploy
```

**Accéder au shell du conteneur app :**
```bash
docker-compose exec app sh
```

**Accéder à la base de données PostgreSQL :**
```bash
docker-compose exec postgres psql -U budget_user -d budget_db
```

**Voir l'utilisation des ressources :**
```bash
docker stats
```

## 🐛 Dépannage

### L'application ne démarre pas

1. Vérifiez les logs :
```bash
docker-compose logs app
```

2. Vérifiez que PostgreSQL est prêt :
```bash
docker-compose exec postgres pg_isready
```

3. Vérifiez les variables d'environnement :
```bash
docker-compose exec app env | grep DATABASE_URL
```

### Erreur de connexion à la base de données

- Attendez quelques secondes après `docker-compose up`
- PostgreSQL peut prendre 10-15 secondes pour démarrer
- Vérifiez que le mot de passe dans DATABASE_URL correspond

### Problème de permissions

Si vous avez des erreurs de permissions :
```bash
docker-compose down
sudo chown -R $USER:$USER .
docker-compose up -d
```

## 📊 Monitoring et Production

Pour la production, considérez :

1. **Monitoring** : Ajoutez Prometheus + Grafana
2. **Logs centralisés** : Utilisez ELK Stack ou Loki
3. **Backup automatisé** : Script cron pour les backups réguliers
4. **Scaling** : Utilisez Docker Swarm ou Kubernetes
5. **CDN** : Cloudflare pour les assets statiques
6. **Health checks** : Configurés dans docker-compose.yml

## 🔒 Sécurité

- ✅ Changez TOUS les mots de passe par défaut
- ✅ Utilisez HTTPS en production (Let's Encrypt)
- ✅ Limitez l'accès réseau avec des firewalls
- ✅ Mettez à jour régulièrement les images Docker
- ✅ Scannez les vulnérabilités avec `docker scan`
- ✅ Ne commitez JAMAIS les fichiers `.env`

## 📝 Notes

- Le build Docker prend environ 5-10 minutes la première fois
- Les fichiers générés par Prisma sont inclus dans l'image
- Le mode standalone de Next.js réduit la taille de l'image
- Les logs de l'application sont disponibles via `docker-compose logs`
