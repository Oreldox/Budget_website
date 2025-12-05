#!/bin/bash

echo "🔍 Validation de la configuration Docker pour le déploiement"
echo "============================================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Fonction de vérification
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1 existe"
  else
    echo -e "${RED}✗${NC} $1 MANQUANT"
    ((errors++))
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} Dossier $1 existe"
  else
    echo -e "${RED}✗${NC} Dossier $1 MANQUANT"
    ((errors++))
  fi
}

check_content() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $3"
  else
    echo -e "${YELLOW}⚠${NC} $3 - À vérifier"
    ((warnings++))
  fi
}

echo "📋 Fichiers Docker essentiels"
echo "------------------------------"
check_file "Dockerfile"
check_file "docker-compose.yml"
check_file ".dockerignore"
check_file "docker-entrypoint.sh"
check_file ".env.docker"
echo ""

echo "📂 Structure du projet"
echo "------------------------------"
check_dir "prisma"
check_dir "app"
check_dir "public"
check_dir "node_modules/.bin" || echo -e "${YELLOW}⚠${NC} node_modules pas installé (npm install requis)"
echo ""

echo "🗄️ Fichiers Prisma"
echo "------------------------------"
check_file "prisma/schema.prisma"
check_file "package.json"
echo ""

echo "⚙️ Configuration Next.js"
echo "------------------------------"
check_file "next.config.js"
check_content "next.config.js" "output.*standalone" "Configuration standalone activée"
echo ""

echo "🔐 Variables d'environnement"
echo "------------------------------"
check_file ".env"
if [ -f ".env" ]; then
  check_content ".env" "NEXTAUTH_SECRET" "NEXTAUTH_SECRET défini"
  check_content ".env" "DATABASE_URL" "DATABASE_URL défini"

  # Vérifier que le secret n'est pas celui par défaut
  if grep -q "change_this_to_a_random_secret" ".env" 2>/dev/null; then
    echo -e "${RED}✗${NC} NEXTAUTH_SECRET utilise encore la valeur par défaut !"
    ((errors++))
  else
    echo -e "${GREEN}✓${NC} NEXTAUTH_SECRET a été personnalisé"
  fi
fi
echo ""

echo "📝 Vérification .dockerignore"
echo "------------------------------"
if grep -q "^prisma/$" ".dockerignore" 2>/dev/null; then
  echo -e "${RED}✗${NC} .dockerignore bloque le dossier prisma/ !"
  ((errors++))
elif grep -q "^prisma/\*\.db$" ".dockerignore" 2>/dev/null; then
  echo -e "${RED}✗${NC} .dockerignore bloque prisma/*.db (trop large) !"
  ((errors++))
else
  echo -e "${GREEN}✓${NC} .dockerignore correctement configuré"
fi

# Vérifier que les fichiers .ts ne sont pas bloqués
if grep -q "scripts/\*\.ts$" ".dockerignore" 2>/dev/null; then
  echo -e "${RED}✗${NC} .dockerignore bloque tous les scripts .ts !"
  ((errors++))
else
  echo -e "${GREEN}✓${NC} Scripts TypeScript non bloqués"
fi
echo ""

echo "🐳 Contenu du Dockerfile"
echo "------------------------------"
check_content "Dockerfile" "COPY.*prisma" "Copie du dossier prisma"
check_content "Dockerfile" "prisma generate" "Génération du client Prisma"
check_content "Dockerfile" "output.*standalone" "Mode standalone (dans next.config.js)"
echo ""

echo "🚀 Script d'entrée Docker"
echo "------------------------------"
check_content "docker-entrypoint.sh" "npx prisma" "Commandes Prisma présentes"
check_content "docker-entrypoint.sh" "mkdir -p /app/data" "Création du dossier data"
check_content "docker-entrypoint.sh" "exec node server.js" "Démarrage de l'application"
echo ""

echo "📊 Résumé"
echo "============================================================"
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
  echo -e "${GREEN}✓ Tous les tests sont passés ! Prêt pour le déploiement Docker.${NC}"
  exit 0
elif [ $errors -eq 0 ]; then
  echo -e "${YELLOW}⚠ $warnings avertissement(s). Vérifiez les points ci-dessus.${NC}"
  exit 0
else
  echo -e "${RED}✗ $errors erreur(s) critique(s) détectée(s).${NC}"
  echo -e "${RED}Corrigez ces problèmes avant de déployer.${NC}"
  exit 1
fi
