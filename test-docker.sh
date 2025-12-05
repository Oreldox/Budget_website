#!/bin/bash

echo "🧪 Test de configuration Docker PostgreSQL"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

errors=0

echo "1. Vérification du fichier .env.postgres"
if [ -f ".env.postgres" ]; then
  echo -e "${GREEN}✓${NC} .env.postgres existe"

  # Vérifier qu'il n'y a pas de guillemets
  if grep -q 'DATABASE_URL="' .env.postgres; then
    echo -e "${RED}✗${NC} .env.postgres contient des guillemets autour de DATABASE_URL"
    ((errors++))
  else
    echo -e "${GREEN}✓${NC} DATABASE_URL sans guillemets"
  fi
else
  echo -e "${RED}✗${NC} .env.postgres manquant"
  ((errors++))
fi
echo ""

echo "2. Vérification du docker-compose.postgres.yml"
if [ -f "docker-compose.postgres.yml" ]; then
  echo -e "${GREEN}✓${NC} docker-compose.postgres.yml existe"
else
  echo -e "${RED}✗${NC} docker-compose.postgres.yml manquant"
  ((errors++))
fi
echo ""

echo "3. Vérification du Dockerfile"
if grep -q "ARG DATABASE_URL" Dockerfile; then
  echo -e "${GREEN}✓${NC} Dockerfile contient ARG DATABASE_URL"
else
  echo -e "${RED}✗${NC} Dockerfile manque ARG DATABASE_URL"
  ((errors++))
fi
echo ""

echo "4. Vérification du schema Prisma"
if grep -q 'provider = "postgresql"' prisma/schema.prisma; then
  echo -e "${GREEN}✓${NC} Prisma configuré pour PostgreSQL"
else
  echo -e "${YELLOW}⚠${NC} Prisma n'est pas configuré pour PostgreSQL"
  echo "   Exécutez: sed -i 's/provider = \"sqlite\"/provider = \"postgresql\"/' prisma/schema.prisma"
fi
echo ""

echo "5. Test de validation Prisma"
if DATABASE_URL=postgresql://test:test@localhost:5432/test npx prisma validate >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Schema Prisma valide"
else
  echo -e "${RED}✗${NC} Schema Prisma invalide"
  ((errors++))
fi
echo ""

echo "6. Vérification TypeScript"
if npx tsc --noEmit >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Aucune erreur TypeScript"
else
  echo -e "${YELLOW}⚠${NC} Des erreurs TypeScript détectées (non bloquantes)"
fi
echo ""

echo "=========================================="
if [ $errors -eq 0 ]; then
  echo -e "${GREEN}✅ Tout est prêt pour le déploiement Docker PostgreSQL !${NC}"
  echo ""
  echo "Pour déployer:"
  echo "  1. cp .env.postgres .env"
  echo "  2. Éditez .env et changez les mots de passe"
  echo "  3. docker-compose -f docker-compose.postgres.yml build"
  echo "  4. docker-compose -f docker-compose.postgres.yml up -d"
  exit 0
else
  echo -e "${RED}❌ $errors erreur(s) détectée(s)${NC}"
  echo "Corrigez les erreurs ci-dessus avant de déployer."
  exit 1
fi
