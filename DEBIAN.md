# 🐧 Guide Docker pour Debian/Ubuntu

## 📋 Installation sur Debian/Ubuntu

### 1. Installation de Docker

```bash
# Mettre à jour le système
sudo apt update
sudo apt upgrade -y

# Installer les dépendances
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Ajouter la clé GPG officielle de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Ajouter le dépôt Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Vérifier l'installation
docker --version
docker compose version
```

### 2. Configuration post-installation

```bash
# Ajouter votre utilisateur au groupe docker (pour éviter sudo)
sudo usermod -aG docker $USER

# Activer Docker au démarrage
sudo systemctl enable docker
sudo systemctl start docker

# SE DÉCONNECTER ET SE RECONNECTER pour que les changements prennent effet
# Ou utiliser : newgrp docker

# Vérifier que Docker fonctionne sans sudo
docker ps
```

### 3. Installation de Make (optionnel)

```bash
sudo apt install -y make
```

### 4. Installation d'OpenSSL (pour générer des secrets)

```bash
sudo apt install -y openssl
```

## 🚀 Déploiement sur Debian

### Cloner le projet

```bash
# Installer git si nécessaire
sudo apt install -y git

# Cloner le projet
cd /opt
sudo git clone https://github.com/votre-repo/site_budget.git
cd site_budget

# Donner les permissions à votre utilisateur
sudo chown -R $USER:$USER /opt/site_budget
```

### Configuration

```bash
# Générer un secret NextAuth
openssl rand -base64 32

# Copier et éditer le fichier de configuration
cp .env.production.example .env.docker
nano .env.docker

# Remplacer NEXTAUTH_SECRET par le secret généré
# Modifier NEXTAUTH_URL si besoin (par exemple : https://budget.votre-domaine.com)
```

### Lancement

#### Option 1 : SQLite (simple, pour débuter)

```bash
# Lancer l'application
docker compose --env-file .env.docker up -d

# Voir les logs
docker compose logs -f app

# L'application est accessible sur http://localhost:3000
```

#### Option 2 : PostgreSQL (recommandé pour production)

```bash
# Éditer .env.docker et configurer PostgreSQL
nano .env.docker

# Décommenter et modifier :
# POSTGRES_USER=budget_user
# POSTGRES_PASSWORD=votre_mot_de_passe_securise
# POSTGRES_DB=budget_db
# DATABASE_URL=postgresql://budget_user:votre_mot_de_passe@postgres:5432/budget_db

# Lancer avec PostgreSQL
docker compose -f docker-compose.postgres.yml --env-file .env.docker up -d

# Voir les logs
docker compose -f docker-compose.postgres.yml logs -f
```

#### Option 3 : Avec Makefile (le plus simple)

```bash
# Afficher l'aide
make help

# Lancer avec SQLite
make up

# Voir les logs
make logs

# Arrêter
make down
```

## 🔧 Configuration en production

### 1. Configuration du firewall (UFW)

```bash
# Installer UFW si nécessaire
sudo apt install -y ufw

# Autoriser SSH (IMPORTANT !)
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer le firewall
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

### 2. Configuration d'un nom de domaine

```bash
# Installer Nginx
sudo apt install -y nginx

# Créer la configuration Nginx
sudo nano /etc/nginx/sites-available/budget

# Ajouter :
server {
    listen 80;
    server_name budget.votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Activer le site
sudo ln -s /etc/nginx/sites-available/budget /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Configuration SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d budget.votre-domaine.com

# Le renouvellement automatique est configuré par défaut
# Tester le renouvellement :
sudo certbot renew --dry-run
```

### 4. Modifier la configuration pour HTTPS

```bash
# Éditer .env.docker
nano .env.docker

# Modifier NEXTAUTH_URL
NEXTAUTH_URL=https://budget.votre-domaine.com

# Redémarrer l'application
docker compose restart app
```

## 🔄 Gestion du service (systemd)

### Créer un service systemd pour auto-démarrage

```bash
# Créer le fichier de service
sudo nano /etc/systemd/system/budget-app.service
```

Contenu :
```ini
[Unit]
Description=Budget Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/site_budget
ExecStart=/usr/bin/docker compose --env-file .env.docker up -d
ExecStop=/usr/bin/docker compose down
User=votre_utilisateur
Group=votre_utilisateur

[Install]
WantedBy=multi-user.target
```

```bash
# Activer le service
sudo systemctl daemon-reload
sudo systemctl enable budget-app.service
sudo systemctl start budget-app.service

# Vérifier le statut
sudo systemctl status budget-app.service
```

## 📊 Monitoring et logs

### Logs système

```bash
# Logs Docker
sudo journalctl -u docker.service -f

# Logs de l'application
docker compose logs -f app

# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitoring des ressources

```bash
# Installer htop
sudo apt install -y htop

# Voir les ressources
htop

# Stats Docker
docker stats

# Utilisation disque
df -h
docker system df
```

## 💾 Backups automatiques

### Script de backup

```bash
# Créer le dossier de backups
sudo mkdir -p /var/backups/budget
sudo chown $USER:$USER /var/backups/budget

# Créer le script de backup
nano ~/backup-budget.sh
```

Contenu :
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/budget"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup SQLite
if [ -f "docker-compose.yml" ]; then
    docker cp budget_app:/app/data/budget.db "$BACKUP_DIR/budget_$DATE.db"
    echo "SQLite backup créé: budget_$DATE.db"
fi

# Backup PostgreSQL
if docker ps | grep -q budget_postgres; then
    docker exec budget_postgres pg_dump -U budget_user budget_db > "$BACKUP_DIR/budget_$DATE.sql"
    echo "PostgreSQL backup créé: budget_$DATE.sql"
fi

# Garder uniquement les 30 derniers backups
find "$BACKUP_DIR" -type f -mtime +30 -delete
echo "Anciens backups supprimés"
```

```bash
# Rendre exécutable
chmod +x ~/backup-budget.sh

# Tester
~/backup-budget.sh
```

### Automatiser avec cron

```bash
# Éditer crontab
crontab -e

# Ajouter (backup tous les jours à 2h du matin)
0 2 * * * /home/votre_utilisateur/backup-budget.sh >> /var/log/budget-backup.log 2>&1
```

## 🔐 Sécurité renforcée

### 1. Fail2ban (protection contre les attaques brute-force)

```bash
# Installer fail2ban
sudo apt install -y fail2ban

# Copier la configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Éditer
sudo nano /etc/fail2ban/jail.local

# Activer et démarrer
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Limiter les connexions SSH

```bash
# Éditer la configuration SSH
sudo nano /etc/ssh/sshd_config

# Modifier :
PermitRootLogin no
PasswordAuthentication no  # Si vous utilisez des clés SSH
MaxAuthTries 3

# Redémarrer SSH
sudo systemctl restart sshd
```

### 3. Mises à jour automatiques de sécurité

```bash
# Installer unattended-upgrades
sudo apt install -y unattended-upgrades

# Configurer
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 🐛 Résolution de problèmes Debian

### Permission denied sur docker

```bash
# Vérifier que vous êtes dans le groupe docker
groups

# Si docker n'apparaît pas :
sudo usermod -aG docker $USER
newgrp docker

# Ou se déconnecter/reconnecter
```

### Port 3000 déjà utilisé

```bash
# Trouver le processus
sudo lsof -i :3000

# Tuer le processus (remplacer PID)
sudo kill -9 PID

# Ou changer le port dans .env.docker
nano .env.docker
# Modifier APP_PORT=3001
```

### Problème de résolution DNS dans Docker

```bash
# Éditer la configuration Docker
sudo nano /etc/docker/daemon.json

# Ajouter :
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}

# Redémarrer Docker
sudo systemctl restart docker
```

### Manque d'espace disque

```bash
# Nettoyer Docker
docker system prune -a
docker volume prune

# Vérifier l'espace
df -h
docker system df

# Nettoyer le système
sudo apt autoremove
sudo apt clean
```

## 📈 Performance et optimisation

### Limiter les ressources Docker

Éditer `docker-compose.yml` :
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Optimiser PostgreSQL

```bash
# Se connecter à PostgreSQL
docker compose exec postgres psql -U budget_user -d budget_db

# Analyser les tables
ANALYZE;

# Vacuum
VACUUM ANALYZE;
```

## 🔄 Mise à jour de l'application

```bash
# Aller dans le dossier du projet
cd /opt/site_budget

# Sauvegarder les données
~/backup-budget.sh

# Récupérer les mises à jour
git pull

# Reconstruire l'image
docker compose build --no-cache

# Redémarrer
docker compose down
docker compose --env-file .env.docker up -d

# Vérifier les logs
docker compose logs -f app
```

## 📝 Commandes utiles Debian

```bash
# Voir les processus Docker
docker ps -a

# Voir les logs système
sudo journalctl -xe

# Voir les connexions réseau
sudo netstat -tulpn | grep docker

# Redémarrer tous les services
sudo systemctl restart docker
docker compose restart

# Vérifier la santé des conteneurs
docker inspect budget_app | grep -A 10 Health
```

## ✅ Checklist production Debian

- [ ] Docker et Docker Compose installés
- [ ] Utilisateur ajouté au groupe docker
- [ ] Firewall (UFW) configuré
- [ ] SSL/TLS configuré (Let's Encrypt)
- [ ] Nom de domaine pointé vers le serveur
- [ ] Backups automatiques configurés (cron)
- [ ] Monitoring en place
- [ ] Service systemd créé pour auto-démarrage
- [ ] Fail2ban installé
- [ ] SSH sécurisé
- [ ] Mises à jour automatiques activées
- [ ] Tests de charge effectués

## 🎯 Ressources Debian

- [Docker sur Debian](https://docs.docker.com/engine/install/debian/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Certbot Let's Encrypt](https://certbot.eff.org/)
- [UFW Documentation](https://help.ubuntu.com/community/UFW)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Support** : Pour un support spécifique Debian, incluez dans votre rapport :
- Version de Debian (`cat /etc/debian_version`)
- Version de Docker (`docker --version`)
- Logs complets (`docker compose logs`)
