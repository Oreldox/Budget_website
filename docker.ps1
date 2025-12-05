# Script PowerShell pour gérer Docker sur Windows
param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"

function Show-Help {
    Write-Host "=== Commandes Docker disponibles ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "  help            " -ForegroundColor Yellow -NoNewline
    Write-Host "Affiche cette aide"
    Write-Host "  build           " -ForegroundColor Yellow -NoNewline
    Write-Host "Build l'image Docker"
    Write-Host "  up              " -ForegroundColor Yellow -NoNewline
    Write-Host "Lance l'application (SQLite)"
    Write-Host "  up-postgres     " -ForegroundColor Yellow -NoNewline
    Write-Host "Lance avec PostgreSQL"
    Write-Host "  up-nginx        " -ForegroundColor Yellow -NoNewline
    Write-Host "Lance avec PostgreSQL + Nginx"
    Write-Host "  down            " -ForegroundColor Yellow -NoNewline
    Write-Host "Arrête l'application"
    Write-Host "  restart         " -ForegroundColor Yellow -NoNewline
    Write-Host "Redémarre l'application"
    Write-Host "  logs            " -ForegroundColor Yellow -NoNewline
    Write-Host "Affiche les logs"
    Write-Host "  shell           " -ForegroundColor Yellow -NoNewline
    Write-Host "Ouvre un shell dans le conteneur"
    Write-Host "  clean           " -ForegroundColor Yellow -NoNewline
    Write-Host "Nettoie tout (conteneurs, volumes)"
    Write-Host "  rebuild         " -ForegroundColor Yellow -NoNewline
    Write-Host "Rebuild et relance"
    Write-Host ""
    Write-Host "Exemples:" -ForegroundColor Cyan
    Write-Host "  .\docker.ps1 up"
    Write-Host "  .\docker.ps1 logs"
    Write-Host "  .\docker.ps1 down"
}

function Build-Image {
    Write-Host "Building Docker image..." -ForegroundColor Green
    docker-compose build
}

function Start-App {
    Write-Host "Starting application with SQLite..." -ForegroundColor Green
    docker-compose --env-file .env.docker up -d
    Write-Host ""
    Write-Host "Application démarrée sur http://localhost:3000" -ForegroundColor Green
}

function Start-AppPostgres {
    Write-Host "Starting application with PostgreSQL..." -ForegroundColor Green
    docker-compose -f docker-compose.postgres.yml --env-file .env.docker up -d
    Write-Host ""
    Write-Host "Application démarrée sur http://localhost:3000" -ForegroundColor Green
}

function Start-AppNginx {
    Write-Host "Starting application with PostgreSQL + Nginx..." -ForegroundColor Green
    docker-compose -f docker-compose.postgres.yml --env-file .env.docker --profile with-nginx up -d
    Write-Host ""
    Write-Host "Application démarrée:" -ForegroundColor Green
    Write-Host "  - Direct: http://localhost:3000"
    Write-Host "  - Nginx:  http://localhost:80"
}

function Stop-App {
    Write-Host "Stopping application..." -ForegroundColor Yellow
    docker-compose down
    docker-compose -f docker-compose.postgres.yml down
}

function Restart-App {
    Stop-App
    Start-Sleep -Seconds 2
    Start-App
}

function Show-Logs {
    docker-compose logs -f app
}

function Open-Shell {
    docker-compose exec app sh
}

function Clean-All {
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    docker-compose down -v
    docker-compose -f docker-compose.postgres.yml down -v
    Write-Host "Cleanup complete!" -ForegroundColor Green
}

function Rebuild-App {
    Write-Host "Rebuilding and restarting..." -ForegroundColor Green
    Stop-App
    Start-Sleep -Seconds 2
    Build-Image
    Start-App
}

# Exécuter la commande
switch ($Command.ToLower()) {
    "help" { Show-Help }
    "build" { Build-Image }
    "up" { Start-App }
    "up-postgres" { Start-AppPostgres }
    "up-nginx" { Start-AppNginx }
    "down" { Stop-App }
    "restart" { Restart-App }
    "logs" { Show-Logs }
    "shell" { Open-Shell }
    "clean" { Clean-All }
    "rebuild" { Rebuild-App }
    default {
        Write-Host "Commande inconnue: $Command" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
