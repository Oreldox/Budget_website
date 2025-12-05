# 🐳 Docker - Application de Gestion Budgétaire

## 🚀 Démarrage rapide

**Vous voulez lancer l'application avec Docker ?**

👉 **Lisez d'abord** : [README.DOCKER_START.md](README.DOCKER_START.md)

Ce guide vous orientera automatiquement vers la bonne documentation selon votre système d'exploitation.

---

## 📚 Documentation disponible

| Document | Description | Temps de lecture |
|----------|-------------|------------------|
| **[README.DOCKER_START.md](README.DOCKER_START.md)** | 🎯 **COMMENCEZ ICI** - Guide de sélection | 2 min |
| [QUICKSTART.md](QUICKSTART.md) | Démarrage en 3 commandes | 3 min |
| [WINDOWS.md](WINDOWS.md) | Guide complet Windows | 15 min |
| [DEBIAN.md](DEBIAN.md) | Guide complet Debian/Ubuntu | 15 min |
| [README.docker.md](README.docker.md) | Documentation technique | 20 min |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Guide de déploiement | 10 min |
| [DOCKER_CHECKLIST.md](DOCKER_CHECKLIST.md) | Liste de vérification | 5 min |
| [DOCKER_FILES_SUMMARY.md](DOCKER_FILES_SUMMARY.md) | Récapitulatif des fichiers | 5 min |

---

## ⚡ Commandes ultra-rapides

### Windows
```powershell
.\docker.ps1 up
```

### Linux/Mac
```bash
make up
```

### Universel
```bash
docker compose --env-file .env.docker up -d
```

---

## 📦 Fichiers Docker

```
📁 Docker
├── Dockerfile                      # Image optimisée
├── docker-compose.yml             # SQLite (défaut)
├── docker-compose.postgres.yml    # PostgreSQL
├── docker-entrypoint.sh           # Script de démarrage
├── .env.docker                    # Configuration
└── nginx.conf                     # Reverse proxy

🛠️ Scripts
├── Makefile                       # Linux/Mac
├── docker.ps1                     # Windows
└── docker-test.sh                 # Tests

📚 Documentation
├── README.DOCKER_START.md         # 🎯 COMMENCEZ ICI
├── QUICKSTART.md                  # Démarrage rapide
├── WINDOWS.md                     # Guide Windows
├── DEBIAN.md                      # Guide Linux
└── ... (voir liste complète ci-dessus)
```

---

## ✅ Configuration minimale

1. **Installer Docker** selon votre OS
2. **Modifier `.env.docker`** : Changer `NEXTAUTH_SECRET`
3. **Lancer** : `docker compose up -d`
4. **Accéder** : http://localhost:3000

---

## 🎯 Choix de la base de données

### SQLite (défaut)
- Simple, rapide, aucune configuration
- Parfait pour < 100 utilisateurs

### PostgreSQL (production)
- Robuste, scalable
- Recommandé pour > 100 utilisateurs

---

## 📊 Support

| OS | Guide | Script |
|----|-------|--------|
| 🪟 Windows | [WINDOWS.md](WINDOWS.md) | `docker.ps1` |
| 🐧 Debian/Ubuntu | [DEBIAN.md](DEBIAN.md) | `Makefile` |
| 🍎 macOS | [QUICKSTART.md](QUICKSTART.md) | `Makefile` |

---

## 🆘 Besoin d'aide ?

1. **Débutant ?** → Lisez [README.DOCKER_START.md](README.DOCKER_START.md)
2. **Problème Windows ?** → Consultez [WINDOWS.md](WINDOWS.md)
3. **Problème Linux ?** → Consultez [DEBIAN.md](DEBIAN.md)
4. **Question technique ?** → Lisez [README.docker.md](README.docker.md)

---

## 🎉 Prêt à commencer ?

👉 **[Cliquez ici pour démarrer](README.DOCKER_START.md)**

---

**Version** : 1.0
**Testé avec** : Docker 24.0+, Node.js 20.18, Next.js 15.1.3
