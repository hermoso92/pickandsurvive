# Script para actualizar archivos .env con las credenciales correctas

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ACTUALIZAR ARCHIVOS .env" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Generar JWT_SECRET si no existe
Write-Host "🔐 Generando JWT_SECRET seguro..." -ForegroundColor Yellow
try {
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>&1
    if ($LASTEXITCODE -ne 0) {
        # Fallback si node no funciona
        $jwtSecret = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
        Write-Host "   (Usando generador alternativo)" -ForegroundColor Gray
    } else {
        $jwtSecret = $jwtSecret.Trim()
    }
    Write-Host "✅ JWT_SECRET generado" -ForegroundColor Green
} catch {
    $jwtSecret = "CAMBIAR_POR_SECRETO_SEGURO_" + (Get-Date -Format "yyyyMMddHHmmss")
    Write-Host "⚠️  Usando JWT_SECRET temporal - CAMBIAR MANUALMENTE" -ForegroundColor Yellow
}

Write-Host ""

# Actualizar .env del backend
Write-Host "📝 Actualizando pick-survive-backend/.env..." -ForegroundColor Yellow

$backendEnv = @"
# Database Configuration
DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public

# JWT Configuration
JWT_SECRET=$jwtSecret
JWT_EXPIRATION=60m

# Email Configuration (Gmail)
EMAIL_USER=jose-4-9@hotmail.com
EMAIL_PASSWORD=Josemanuel4
EMAIL_FROM=noreply@pickandsurvive.com

# Football API Configuration
FOOTBALL_DATA_TOKEN=ccc08a13c7fd4ae5a5944fea64459c0b

# Application Configuration
PORT=9998
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5174,http://localhost:3000,http://localhost:3002
FRONTEND_URL=http://localhost:5174
"@

$backendEnv | Out-File -FilePath "pick-survive-backend\.env" -Encoding utf8 -NoNewline
Write-Host "✅ Backend .env actualizado" -ForegroundColor Green
Write-Host "   - DATABASE_URL actualizado a: postgres:cosigein" -ForegroundColor Gray
Write-Host "   - PORT actualizado a: 9998" -ForegroundColor Gray
Write-Host "   - JWT_SECRET generado" -ForegroundColor Gray

Write-Host ""

# Crear .env.local del frontend
Write-Host "📝 Creando pick-survive-frontend/.env.local..." -ForegroundColor Yellow

$frontendEnv = @"
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:9998

# Environment
NODE_ENV=development
"@

$frontendEnv | Out-File -FilePath "pick-survive-frontend\.env.local" -Encoding utf8 -NoNewline
Write-Host "✅ Frontend .env.local creado" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ ARCHIVOS ACTUALIZADOS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Resumen de cambios:" -ForegroundColor Cyan
Write-Host "   Backend:" -ForegroundColor White
Write-Host "   - DATABASE_URL: postgres:cosigein" -ForegroundColor Gray
Write-Host "   - PORT: 9998" -ForegroundColor Gray
Write-Host "   - JWT_SECRET: Generado automáticamente" -ForegroundColor Gray
Write-Host ""
Write-Host "   Frontend:" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_API_URL: http://localhost:9998" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. cd pick-survive-backend" -ForegroundColor White
Write-Host "   2. npx prisma generate" -ForegroundColor White
Write-Host "   3. npm run start:dev" -ForegroundColor White
Write-Host ""

