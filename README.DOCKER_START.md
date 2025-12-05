# 🐳 Démarrage Docker - Guide de sélection

## 🎯 Quel guide suivre ?

### 🪟 Vous êtes sur **Windows** ?
👉 Suivez le guide [WINDOWS.md](WINDOWS.md)

**Installation rapide** :
```powershell
# 1. Installer Docker Desktop pour Windows
# 2. Lancer le script PowerShell
.\docker.ps1 up
```

---

### 🐧 Vous êtes sur **Linux (Debian/Ubuntu)** ?
👉 Suivez le guide [DEBIAN.md](DEBIAN.md)

**Installation rapide** :
```bash
# 1. Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Lancer l'application
make up
```

---

### 🍎 Vous êtes sur **macOS** ?
👉 Suivez le guide [QUICKSTART.md](QUICKSTART.md)

**Installation rapide** :
```bash
# 1. Installer Docker Desktop pour Mac
# 2. Lancer l'application
make up
```

---

## 📚 Documentation complète

| Document | Description | Pour qui ? |
|----------|-------------|------------|
| [QUICKSTART.md](QUICKSTART.md) | Démarrage en 3 commandes | Tous |
| [WINDOWS.md](WINDOWS.md) | Guide complet Windows | Windows |
| [DEBIAN.md](DEBIAN.md) | Guide complet Linux | Debian/Ubuntu |
| [README.docker.md](README.docker.md) | Documentation technique complète | Développeurs |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Guide de déploiement production | DevOps |
| [DOCKER_CHECKLIST.md](DOCKER_CHECKLIST.md) | Liste de vérification | Tous |

---

## 🚀 Démarrage ultra-rapide

### J'ai déjà Docker installé

#### Windows PowerShell
```powershell
.\docker.ps1 up
```

#### Linux/Mac
```bash
make up
```

#### Commande universelle
```bash
docker compose --env-file .env.docker up -d
```

---

## 🔐 Configuration minimale requise

**IMPORTANT : Changez le secret NextAuth avant de lancer !**

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Éditez `.env.docker` et remplacez `NEXTAUTH_SECRET` par le secret généré.

---

## 📦 Quelle base de données choisir ?

### SQLite (par défaut) ✅
- **Simple** : Aucune configuration supplémentaire
- **Rapide** : Parfait pour débuter
- **Limite** : < 100 utilisateurs simultanés

**Commande** :
```bash
docker compose --env-file .env.docker up -d
```

### PostgreSQL (recommandé pour production) 🚀
- **Robuste** : Gestion de milliers d'utilisateurs
- **Scalable** : Performance optimale
- **Backups** : Outils de backup avancés

**Commande** :
```bash
docker compose -f docker-compose.postgres.yml --env-file .env.docker up -d
```

---

## ✅ Vérification rapide

```bash
# 1. Vérifier que Docker tourne
docker ps

# 2. Vérifier les logs
docker compose logs app

# 3. Tester l'application
curl http://localhost:3000
# Ou ouvrir http://localhost:3000 dans le navigateur
```

---

## 🆘 Problème ?

### Commandes de diagnostic

```bash
# Voir les conteneurs
docker ps -a

# Voir les logs
docker compose logs app

# Redémarrer
docker compose restart app

# Tout nettoyer et recommencer
docker compose down -v
docker compose --env-file .env.docker up -d
```

### Support par OS

| Problème | Windows | Linux |
|----------|---------|-------|
| Docker ne démarre pas | Voir [WINDOWS.md](WINDOWS.md#erreur--docker-daemon-not-running) | Voir [DEBIAN.md](DEBIAN.md#permission-denied-sur-docker) |
| Port déjà utilisé | `netstat -ano \| findstr :3000` | `sudo lsof -i :3000` |
| Permissions | Exécuter en admin | `sudo usermod -aG docker $USER` |

---

## 🎓 Besoin d'aide ?

1. **Consultez la documentation** selon votre OS
2. **Vérifiez les logs** : `docker compose logs app`
3. **Lisez les erreurs** : souvent explicites
4. **Cherchez dans les guides** : Ctrl+F dans les fichiers .md

---

## 📊 Résumé des fichiers

```
📁 Configuration Docker
├── 🐳 Dockerfile                    # Image Docker optimisée
├── 📄 docker-compose.yml            # Configuration SQLite
├── 📄 docker-compose.postgres.yml   # Configuration PostgreSQL
├── 🔧 docker-entrypoint.sh          # Script de démarrage
├── 🔒 .env.docker                   # Variables d'environnement
├── 🌐 nginx.conf                    # Configuration Nginx
└── 🚫 .dockerignore                 # Fichiers exclus du build

📚 Documentation
├── 🚀 QUICKSTART.md                 # Démarrage rapide (3 commandes)
├── 🪟 WINDOWS.md                    # Guide Windows complet
├── 🐧 DEBIAN.md                     # Guide Debian/Ubuntu complet
├── 📖 README.docker.md              # Documentation technique
├── 🚢 DEPLOYMENT.md                 # Déploiement production
└── ✅ DOCKER_CHECKLIST.md           # Liste de vérification

🛠️ Scripts
├── 💻 docker.ps1                    # Script PowerShell (Windows)
├── 🔨 Makefile                      # Commandes Make (Linux/Mac)
└── 🧪 docker-test.sh                # Tests de validation
```

---

## 🎯 Choix rapide par scénario

### "Je veux juste tester l'application"
```bash
docker compose --env-file .env.docker up -d
```
→ SQLite, simple, rapide

### "Je veux déployer en production"
```bash
docker compose -f docker-compose.postgres.yml --env-file .env.docker up -d
```
→ PostgreSQL, robuste, scalable

### "Je veux mettre en place un vrai serveur"
→ Suivez [DEBIAN.md](DEBIAN.md) + configurez Nginx + SSL

---

## 💡 Commandes essentielles

| Action | Commande |
|--------|----------|
| Démarrer | `docker compose up -d` |
| Arrêter | `docker compose down` |
| Redémarrer | `docker compose restart` |
| Logs | `docker compose logs -f` |
| Shell | `docker compose exec app sh` |
| Nettoyer | `docker compose down -v` |

---

## 🌟 Prêt à commencer ?

1. **Choisissez votre OS** : Windows, Linux, ou Mac
2. **Suivez le guide correspondant** : WINDOWS.md ou DEBIAN.md
3. **Lancez l'application** : Une seule commande !
4. **Ouvrez votre navigateur** : http://localhost:3000

**C'est parti ! 🚀**
