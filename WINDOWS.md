# 🪟 Guide Docker pour Windows

## 📋 Prérequis Windows

1. **Docker Desktop for Windows**
   - Télécharger : https://www.docker.com/products/docker-desktop/
   - Version minimale : 4.0+
   - WSL 2 requis

2. **WSL 2 (Windows Subsystem for Linux)**
   ```powershell
   # Activer WSL 2 (PowerShell en administrateur)
   wsl --install
   ```

3. **Git for Windows** (optionnel)
   - Télécharger : https://git-scm.com/download/win

## 🚀 Démarrage rapide Windows

### Méthode 1 : PowerShell Script (Recommandé)

```powershell
# Afficher l'aide
.\docker.ps1 help

# Lancer l'application
.\docker.ps1 up

# Voir les logs
.\docker.ps1 logs

# Arrêter l'application
.\docker.ps1 down
```

### Méthode 2 : Commandes Docker Compose

```powershell
# Lancer l'application (SQLite)
docker-compose --env-file .env.docker up -d

# Voir les logs
docker-compose logs -f app

# Arrêter
docker-compose down
```

## 🔧 Configuration Windows

### 1. Générer un secret NextAuth

**Option A : OpenSSL (si installé avec Git)**
```bash
# Dans Git Bash
openssl rand -base64 32
```

**Option B : PowerShell**
```powershell
# Générer un secret aléatoire de 32 caractères
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 2. Modifier le fichier .env.docker

```powershell
# Ouvrir avec Notepad
notepad .env.docker

# Ou avec VSCode
code .env.docker
```

Remplacer la ligne :
```
NEXTAUTH_SECRET=change_this_to_a_random_secret_string_minimum_32_characters
```

Par votre secret généré.

## 📂 Chemins Windows

### Chemins absolus dans docker-compose
Les chemins Windows utilisent des backslashes `\`, mais Docker utilise des slashes `/`.

**Correct** :
```yaml
volumes:
  - ./data:/app/data
```

**Incorrect** :
```yaml
volumes:
  - .\data:/app/data
```

### Variables d'environnement Windows

```powershell
# Définir une variable temporaire
$env:APP_PORT=3001

# Lancer avec la variable
docker-compose --env-file .env.docker up -d
```

## 🐛 Résolution de problèmes Windows

### Erreur : "Docker daemon not running"

1. Ouvrir Docker Desktop
2. Attendre que Docker démarre (icône dans la barre des tâches)
3. Réessayer la commande

### Erreur : "WSL 2 installation incomplete"

```powershell
# PowerShell en administrateur
wsl --update
wsl --set-default-version 2
```

Redémarrer l'ordinateur si nécessaire.

### Erreur : "Drive not shared"

1. Docker Desktop → Settings → Resources → File Sharing
2. Ajouter le lecteur `C:\` (ou le lecteur du projet)
3. Apply & Restart

### Port déjà utilisé

```powershell
# Trouver le processus utilisant le port 3000
netstat -ano | findstr :3000

# Tuer le processus (remplacer PID par le numéro trouvé)
taskkill /PID <PID> /F
```

### Erreur de permissions

```powershell
# Exécuter PowerShell en tant qu'administrateur
# Clic droit sur PowerShell → "Exécuter en tant qu'administrateur"

# Autoriser l'exécution de scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Lenteur de Docker sur Windows

1. **Activer WSL 2** (plus rapide que Hyper-V)
   ```powershell
   wsl --set-default-version 2
   ```

2. **Augmenter les ressources**
   - Docker Desktop → Settings → Resources
   - CPU : 4+ cores
   - Memory : 4+ GB

3. **Désactiver les analyses antivirus** sur le dossier du projet

### Problème avec les fins de ligne (CRLF vs LF)

```powershell
# Git Bash
dos2unix docker-entrypoint.sh

# Ou avec PowerShell
(Get-Content docker-entrypoint.sh -Raw) -replace "`r`n", "`n" | Set-Content docker-entrypoint.sh -NoNewline
```

## 🔍 Commandes de diagnostic Windows

```powershell
# Vérifier Docker
docker --version
docker-compose --version

# Vérifier WSL
wsl --list --verbose

# Vérifier l'état de Docker
docker ps

# Vérifier les logs système Docker
docker system info

# Nettoyer Docker
docker system prune -a

# Vérifier l'espace disque
docker system df
```

## 📊 Monitoring sur Windows

### Voir les ressources utilisées

```powershell
# Stats en temps réel
docker stats

# Avec PowerShell (alternative)
Get-Process | Where-Object {$_.ProcessName -like "*docker*"} | Format-Table ProcessName, CPU, WorkingSet -AutoSize
```

## 🎯 Commandes spécifiques Windows

### Backup de la base de données

```powershell
# Créer un dossier de backup
New-Item -ItemType Directory -Force -Path .\backups

# Backup SQLite
docker cp budget_app:/app/data/budget.db .\backups\budget_$(Get-Date -Format 'yyyyMMdd_HHmmss').db

# Backup PostgreSQL
docker exec budget_postgres pg_dump -U budget_user budget_db > .\backups\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
```

### Restaurer un backup

```powershell
# Restaurer SQLite
docker cp .\backups\budget_20240101_120000.db budget_app:/app/data/budget.db
docker-compose restart app

# Restaurer PostgreSQL
Get-Content .\backups\backup_20240101_120000.sql | docker exec -i budget_postgres psql -U budget_user -d budget_db
```

### Ouvrir un shell dans le conteneur

```powershell
# Shell interactif
docker-compose exec app sh

# Exécuter une commande unique
docker-compose exec app npx prisma migrate deploy
```

## 📝 Script batch alternatif

Si PowerShell ne fonctionne pas, créer `docker.bat` :

```batch
@echo off

if "%1"=="up" (
    docker-compose --env-file .env.docker up -d
    echo Application démarrée sur http://localhost:3000
) else if "%1"=="down" (
    docker-compose down
    echo Application arrêtée
) else if "%1"=="logs" (
    docker-compose logs -f app
) else if "%1"=="restart" (
    docker-compose restart app
    echo Application redémarrée
) else (
    echo Commandes disponibles:
    echo   docker.bat up      - Lancer l'application
    echo   docker.bat down    - Arrêter l'application
    echo   docker.bat logs    - Voir les logs
    echo   docker.bat restart - Redémarrer
)
```

Utilisation :
```cmd
docker.bat up
docker.bat logs
docker.bat down
```

## 🌐 Accès depuis l'extérieur (LAN)

1. **Trouver votre IP locale**
   ```powershell
   ipconfig | findstr IPv4
   ```

2. **Configurer le firewall**
   ```powershell
   # PowerShell en administrateur
   New-NetFirewallRule -DisplayName "Docker App" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

3. **Modifier NEXTAUTH_URL**
   ```
   NEXTAUTH_URL=http://192.168.1.XXX:3000
   ```

4. **Accès depuis un autre appareil**
   ```
   http://192.168.1.XXX:3000
   ```

## 🎓 Astuces Windows

### Terminal recommandé
- **Windows Terminal** (Microsoft Store)
- Support de PowerShell, CMD, Git Bash, WSL
- Onglets multiples, personnalisation

### Éditeur de texte
- **Visual Studio Code** (recommandé)
- **Notepad++**
- Éviter Notepad (problème de fins de ligne)

### Alias PowerShell

Ajouter à votre profil PowerShell (`$PROFILE`) :

```powershell
# Ouvrir le profil
notepad $PROFILE

# Ajouter ces alias
function docker-up { docker-compose --env-file .env.docker up -d }
function docker-down { docker-compose down }
function docker-logs { docker-compose logs -f app }
function docker-restart { docker-compose restart app }

# Utilisation
docker-up
docker-logs
docker-down
```

## ✅ Checklist Windows

- [ ] Docker Desktop installé et démarré
- [ ] WSL 2 activé
- [ ] Projet cloné ou téléchargé
- [ ] `.env.docker` configuré avec un secret unique
- [ ] Ports 3000 disponible (ou changé dans .env.docker)
- [ ] Firewall configuré (si accès externe)
- [ ] Script PowerShell testé

## 📚 Ressources Windows

- [Docker Desktop pour Windows](https://docs.docker.com/desktop/windows/)
- [WSL 2 Documentation](https://docs.microsoft.com/fr-fr/windows/wsl/)
- [Docker avec WSL 2](https://docs.docker.com/desktop/windows/wsl/)
- [PowerShell Documentation](https://docs.microsoft.com/fr-fr/powershell/)

---

**Support** : Si vous rencontrez des problèmes spécifiques à Windows, créez une issue sur GitHub avec :
- Version de Windows
- Version de Docker Desktop
- Version de WSL
- Logs d'erreur complets
