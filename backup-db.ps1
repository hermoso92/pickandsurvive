# Script de backup automático para Pick & Survive
# Uso: .\backup-db.ps1

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\backups"
$backupFile = "$backupDir\backup_picksurvive_$timestamp.sql"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BACKUP BASE DE DATOS - PICK & SURVIVE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Crear directorio de backups si no existe
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "✅ Directorio de backups creado: $backupDir" -ForegroundColor Green
}

Write-Host "🔄 Iniciando backup de base de datos..." -ForegroundColor Yellow

# Verificar que el contenedor está corriendo
$container = docker ps --filter "name=pick-survive-db" --format "{{.Names}}"
if (-not $container) {
    Write-Host "❌ Error: Contenedor pick-survive-db no está corriendo" -ForegroundColor Red
    Write-Host "   Ejecuta: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Contenedor encontrado: $container" -ForegroundColor Green

# Exportar base de datos
Write-Host "📤 Exportando base de datos..." -ForegroundColor Yellow
try {
    docker exec pick-survive-db pg_dump -U admin picksurvive > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "✅ Backup completado exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📁 Archivo: $backupFile" -ForegroundColor Cyan
        Write-Host "📊 Tamaño: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
        Write-Host "🕐 Fecha: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Gray
        Write-Host ""
        
        # Mantener solo los últimos 10 backups
        $oldBackups = Get-ChildItem $backupDir -Filter "backup_picksurvive_*.sql" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -Skip 10
        
        if ($oldBackups.Count -gt 0) {
            Write-Host "🧹 Eliminando backups antiguos..." -ForegroundColor Yellow
            $oldBackups | Remove-Item
            Write-Host "✅ Eliminados $($oldBackups.Count) backups antiguos" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "✅ Proceso completado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al crear backup (código: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error inesperado: $_" -ForegroundColor Red
    exit 1
}

