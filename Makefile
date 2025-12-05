.PHONY: help build up down restart logs clean setup

# Couleurs pour le terminal
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m

help: ## Affiche l'aide
	@echo "$(GREEN)Commandes disponibles:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

setup: ## Créer le fichier .env.docker (première fois)
	@if [ ! -f .env.docker ]; then \
		echo "$(GREEN)Création de .env.docker...$(NC)"; \
		cp .env.production.example .env.docker; \
		echo "$(YELLOW)ATTENTION: Modifiez NEXTAUTH_SECRET dans .env.docker$(NC)"; \
	else \
		echo "$(GREEN).env.docker existe déjà$(NC)"; \
	fi

build: ## Build l'image Docker
	@echo "$(GREEN)Building Docker image...$(NC)"
	docker compose build

up: setup ## Lance l'application (SQLite)
	@echo "$(GREEN)Starting application with SQLite...$(NC)"
	docker compose --env-file .env.docker up -d
	@echo "$(GREEN)Application démarrée sur http://localhost:3000$(NC)"

up-postgres: setup ## Lance l'application avec PostgreSQL
	@echo "$(GREEN)Starting application with PostgreSQL...$(NC)"
	docker compose -f docker-compose.postgres.yml --env-file .env.docker up -d
	@echo "$(GREEN)Application démarrée sur http://localhost:3000$(NC)"

up-nginx: setup ## Lance l'application avec PostgreSQL + Nginx
	@echo "$(GREEN)Starting application with PostgreSQL + Nginx...$(NC)"
	docker compose -f docker-compose.postgres.yml --env-file .env.docker --profile with-nginx up -d
	@echo "$(GREEN)Application démarrée:$(NC)"
	@echo "  - Direct: http://localhost:3000"
	@echo "  - Nginx:  http://localhost:80"

down: ## Arrête l'application
	@echo "$(YELLOW)Stopping application...$(NC)"
	docker compose down 2>/dev/null || true
	docker compose -f docker-compose.postgres.yml down 2>/dev/null || true

restart: ## Redémarre l'application
	@$(MAKE) down
	@$(MAKE) up

logs: ## Affiche les logs
	docker compose logs -f app

logs-postgres: ## Affiche les logs (version PostgreSQL)
	docker compose -f docker-compose.postgres.yml logs -f

shell: ## Ouvre un shell dans le conteneur
	docker compose exec app sh

clean: ## Nettoie tout (conteneurs, images, volumes)
	@echo "$(YELLOW)Cleaning up...$(NC)"
	docker compose down -v 2>/dev/null || true
	docker compose -f docker-compose.postgres.yml down -v 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete!$(NC)"

rebuild: ## Rebuild et relance l'application
	@echo "$(GREEN)Rebuilding and restarting...$(NC)"
	@$(MAKE) down
	@$(MAKE) build
	@$(MAKE) up
