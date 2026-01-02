# Script para exportar base de datos correctamente para pgAdmin
# Uso: .\exportar-para-pgadmin.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXPORTAR PARA PGADMIN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
Write-Host "🔍 Verificando Docker..." -ForegroundColor Yellow
$container = docker ps --filter "name=pick-survive-db" --format "{{.Names}}"
if (-not $container) {
    Write-Host "❌ Error: Contenedor pick-survive-db no está corriendo" -ForegroundColor Red
    Write-Host "   Ejecuta: cd pick-survive-backend && docker-compose up -d" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Contenedor encontrado: $container" -ForegroundColor Green
Write-Host ""

# Nombre del archivo
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backup_pgadmin_$timestamp.sql"

Write-Host "📤 Exportando base de datos..." -ForegroundColor Yellow
Write-Host "   Formato: SQL plano (compatible con pgAdmin)" -ForegroundColor Gray
Write-Host ""

# Exportar en formato SQL plano (compatible con pgAdmin)
try {
    docker exec pick-survive-db pg_dump -U admin -F p --clean --if-exists picksurvive > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        $lineCount = (Get-Content $backupFile | Measure-Object -Line).Lines
        
        Write-Host "✅ Exportación completada exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📁 Archivo: $backupFile" -ForegroundColor Cyan
        Write-Host "📊 Tamaño: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
        Write-Host "📝 Líneas: $lineCount" -ForegroundColor Gray
        Write-Host ""
        
        # Verificar contenido
        Write-Host "🔍 Verificando contenido..." -ForegroundColor Yellow
        $firstLines = Get-Content $backupFile | Select-Object -First 5
        if ($firstLines -match "PostgreSQL database dump") {
            Write-Host "✅ Archivo SQL válido" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Primeras líneas:" -ForegroundColor Cyan
            $firstLines | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        } else {
            Write-Host "⚠️  Advertencia: El archivo puede estar corrupto" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "📥 Para importar en pgAdmin:" -ForegroundColor Cyan
        Write-Host "   1. Abre pgAdmin" -ForegroundColor White
        Write-Host "   2. Click derecho en la base de datos → Restore..." -ForegroundColor White
        Write-Host "   3. Selecciona: $backupFile" -ForegroundColor White
        Write-Host "   4. Format: Plain" -ForegroundColor White
        Write-Host "   5. Click Restore" -ForegroundColor White
        Write-Host ""
        
    } else {
        Write-Host "❌ Error al exportar (código: $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error inesperado: $_" -ForegroundColor Red
    exit 1
}

