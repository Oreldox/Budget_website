# 🚀 Guide de démarrage rapide Docker

## En 3 commandes

```bash
# 1. Générer un secret (copier le résultat)
openssl rand -base64 32

# 2. Éditer .env.docker et remplacer NEXTAUTH_SECRET par le secret généré
nano .env.docker

# 3. Lancer l'application
docker-compose --env-file .env.docker up -d
```

L'application sera accessible sur **http://localhost:3000**

## Commandes essentielles

```bash
# Voir les logs
docker-compose logs -f app

# Arrêter l'application
docker-compose down

# Redémarrer
docker-compose restart app

# Accéder au shell du conteneur
docker-compose exec app sh
```

## Windows PowerShell

```powershell
# Lancer l'application
.\docker.ps1 up

# Voir les logs
.\docker.ps1 logs

# Arrêter
.\docker.ps1 down
```

## Linux/Mac avec Make

```bash
# Lancer
make up

# Logs
make logs

# Arrêter
make down
```

## Vérifier que tout fonctionne

1. Ouvrir http://localhost:3000
2. Créer un compte utilisateur
3. Se connecter

## Résolution des problèmes courants

### Port 3000 déjà utilisé

Modifier `APP_PORT` dans `.env.docker` :
```
APP_PORT=3001
```

### Erreur "no space left on device"

Nettoyer Docker :
```bash
docker system prune -a
```

### L'application ne démarre pas

Vérifier les logs :
```bash
docker-compose logs app
```

## Documentation complète

- [README.docker.md](README.docker.md) - Guide complet Docker
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de déploiement détaillé
