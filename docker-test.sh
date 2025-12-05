#!/bin/bash
# Script de test pour vérifier la configuration Docker

set -e

echo "======================================"
echo "Test de la configuration Docker"
echo "======================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Fonction pour afficher un succès
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Fonction pour afficher une erreur
error() {
    echo -e "${RED}✗${NC} $1"
}

# Fonction pour afficher un avertissement
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Test 1: Docker installé
echo "Test 1: Vérification de Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    success "Docker installé: $DOCKER_VERSION"
else
    error "Docker n'est pas installé"
    exit 1
fi

# Test 2: Docker Compose installé
echo "Test 2: Vérification de Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    success "Docker Compose installé: $COMPOSE_VERSION"
else
    error "Docker Compose n'est pas installé"
    exit 1
fi

# Test 3: Fichiers requis présents
echo "Test 3: Vérification des fichiers..."
files=(
    "Dockerfile"
    "docker-compose.yml"
    "docker-compose.postgres.yml"
    "docker-entrypoint.sh"
    ".dockerignore"
    ".env.docker"
    "nginx.conf"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        success "$file présent"
    else
        error "$file manquant"
        exit 1
    fi
done

# Test 4: Validation docker-compose.yml
echo "Test 4: Validation de docker-compose.yml..."
if docker-compose -f docker-compose.yml config > /dev/null 2>&1; then
    success "docker-compose.yml valide"
else
    error "docker-compose.yml invalide"
    docker-compose -f docker-compose.yml config
    exit 1
fi

# Test 5: Validation docker-compose.postgres.yml
echo "Test 5: Validation de docker-compose.postgres.yml..."
if docker-compose -f docker-compose.postgres.yml config > /dev/null 2>&1; then
    success "docker-compose.postgres.yml valide"
else
    error "docker-compose.postgres.yml invalide"
    docker-compose -f docker-compose.postgres.yml config
    exit 1
fi

# Test 6: Vérification du fichier .env.docker
echo "Test 6: Vérification de .env.docker..."
if grep -q "change_this_to_a_random_secret" .env.docker; then
    warning ".env.docker contient encore le secret par défaut"
    warning "Pensez à changer NEXTAUTH_SECRET avant le déploiement en production"
else
    success ".env.docker configuré"
fi

# Test 7: Vérification des permissions docker-entrypoint.sh
echo "Test 7: Vérification des permissions..."
if [ -x "docker-entrypoint.sh" ]; then
    success "docker-entrypoint.sh est exécutable"
else
    warning "docker-entrypoint.sh n'est pas exécutable"
    chmod +x docker-entrypoint.sh
    success "Permissions corrigées"
fi

# Test 8: Vérification de l'espace disque
echo "Test 8: Vérification de l'espace disque..."
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
success "Espace disponible: $AVAILABLE_SPACE"

# Test 9: Test de build (optionnel)
echo ""
echo "======================================"
read -p "Voulez-vous tester le build Docker ? (o/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "Test 9: Build de l'image Docker..."
    if DOCKER_BUILDKIT=1 docker-compose build --no-cache; then
        success "Build réussi"
    else
        error "Échec du build"
        exit 1
    fi
else
    warning "Test de build ignoré"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Tous les tests sont passés !${NC}"
echo "======================================"
echo ""
echo "Vous pouvez maintenant lancer l'application avec:"
echo "  docker-compose --env-file .env.docker up -d"
echo ""
echo "Ou avec Make:"
echo "  make up"
echo ""
