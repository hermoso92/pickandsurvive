# Script para subir el proyecto a GitHub
# Uso: .\subir-github.ps1 -GitHubUser "tu-usuario" -RepoName "nombre-repositorio"

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUser,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName
)

Write-Host "🚀 Configurando repositorio remoto de GitHub..." -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: No se encontró un repositorio Git. Ejecuta 'git init' primero." -ForegroundColor Red
    exit 1
}

# Agregar el remoto
$remoteUrl = "https://github.com/$GitHubUser/$RepoName.git"
Write-Host "📡 Agregando remoto: $remoteUrl" -ForegroundColor Yellow

git remote remove origin 2>$null
git remote add origin $remoteUrl

# Verificar la rama actual
$currentBranch = git branch --show-current
if (-not $currentBranch) {
    Write-Host "⚠️  No hay rama actual. Creando rama 'main'..." -ForegroundColor Yellow
    git branch -M main
    $currentBranch = "main"
}

# Verificar si hay commits
$commitCount = (git log --oneline 2>$null | Measure-Object -Line).Lines
if ($commitCount -eq 0) {
    Write-Host "❌ Error: No hay commits en el repositorio. Haz un commit primero." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Repositorio local configurado correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Para subir el código, ejecuta:" -ForegroundColor Cyan
Write-Host "   git push -u origin $currentBranch" -ForegroundColor White
Write-Host ""
Write-Host "💡 Si es la primera vez, GitHub puede pedirte autenticación." -ForegroundColor Yellow
Write-Host "   Puedes usar:" -ForegroundColor Yellow
Write-Host "   - Personal Access Token (recomendado)" -ForegroundColor Yellow
Write-Host "   - GitHub CLI (gh auth login)" -ForegroundColor Yellow

