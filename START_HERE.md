# 🚀 COMMENCEZ ICI - Docker

## ⚡ Démarrage en 2 minutes

### 1. Première fois ? Lancez :

```bash
make up
```

Ou sur Windows PowerShell :
```powershell
.\docker.ps1 up
```

**C'est tout !** Le fichier `.env.docker` sera créé automatiquement.

---

## 📝 Ce qui se passe

1. ✅ Le fichier `.env.docker` est créé automatiquement depuis `.env.production.example`
2. ✅ L'image Docker est construite
3. ✅ L'application démarre avec SQLite
4. ✅ Accessible sur http://localhost:3000

---

## 🔐 Important : Sécurité

**AVANT la production**, modifiez `.env.docker` et changez :

```bash
NEXTAUTH_SECRET=votre_secret_unique_ici
```

Générez un secret :
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

## 🎯 Commandes essentielles

| Commande | Description |
|----------|-------------|
| `make up` | Démarrer l'application |
| `make logs` | Voir les logs |
| `make down` | Arrêter l'application |
| `make restart` | Redémarrer |
| `make clean` | Tout nettoyer |

**Windows** : Remplacez `make` par `.\docker.ps1`

Exemple : `.\docker.ps1 up`

---

## ❓ Problèmes ?

### "make: command not found" (Windows)
Utilisez le script PowerShell :
```powershell
.\docker.ps1 up
```

### "Docker daemon not running"
1. Ouvrez Docker Desktop
2. Attendez qu'il démarre
3. Réessayez

### Port 3000 déjà utilisé
Modifiez `.env.docker` :
```
APP_PORT=3001
```

---

## 📚 Documentation complète

- **Windows** : Lisez [WINDOWS.md](WINDOWS.md)
- **Linux** : Lisez [DEBIAN.md](DEBIAN.md)
- **Technique** : Lisez [README.docker.md](README.docker.md)

---

## ✨ Commandes corrigées

**Ancienne syntaxe** (ne fonctionne plus) :
```bash
docker-compose up  # ❌ OBSOLÈTE
```

**Nouvelle syntaxe** (correcte) :
```bash
docker compose up  # ✅ CORRECT
```

Tous les scripts ont été mis à jour avec la bonne syntaxe !

---

**Prêt ? Lancez `make up` ! 🚀**
