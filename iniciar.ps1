# Script de inicio completo para Pick & Survive
# Este script inicia backend y frontend en los puertos correctos (9998 y 5174)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PICK & SURVIVE - INICIO DEL SISTEMA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Funcion para liberar puertos
function Liberar-Puerto {
    param([int]$Puerto)
    
    Write-Host "[*] Verificando puerto $Puerto..." -ForegroundColor Yellow
    
    $proceso = Get-NetTCPConnection -LocalPort $Puerto -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($proceso) {
        Write-Host "[!] Puerto $Puerto en uso. Liberando..." -ForegroundColor Yellow
        Stop-Process -Id $proceso -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "[OK] Puerto $Puerto liberado" -ForegroundColor Green
    } else {
        Write-Host "[OK] Puerto $Puerto disponible" -ForegroundColor Green
    }
}

# Verificar que existan los directorios
$backendPath = "pick-survive-backend"
$frontendPath = "pick-survive-frontend"

if (-not (Test-Path $backendPath)) {
    Write-Host "[ERROR] No se encuentra el directorio $backendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "[ERROR] No se encuentra el directorio $frontendPath" -ForegroundColor Red
    exit 1
}

# Verificar archivo .env en backend
$envFile = Join-Path $backendPath ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "[!] Advertencia: No se encuentra .env en backend" -ForegroundColor Yellow
}

# Liberar puertos
Write-Host ""
Write-Host "[*] Liberando puertos..." -ForegroundColor Cyan
Liberar-Puerto -Puerto 9998
Liberar-Puerto -Puerto 5174
Write-Host ""

# Verificar PostgreSQL (no Docker)
Write-Host "[*] Verificando PostgreSQL..." -ForegroundColor Cyan
$pgPort = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue
if ($pgPort) {
    Write-Host "[OK] PostgreSQL esta corriendo en puerto 5432" -ForegroundColor Green
} else {
    Write-Host "[!] PostgreSQL no esta corriendo en puerto 5432" -ForegroundColor Yellow
    Write-Host "    Asegurate de que PostgreSQL este iniciado" -ForegroundColor Yellow
}

# Iniciar Backend
Write-Host ""
Write-Host "[*] Iniciando Backend (puerto 9998)..." -ForegroundColor Cyan
Set-Location $backendPath

# Verificar node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Instalando dependencias del backend..." -ForegroundColor Yellow
    npm install
}

# Verificar Prisma
if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Host "[ERROR] No se encuentra schema.prisma" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Limpiar directorio dist (evita errores de compilacion)
if (Test-Path "dist") {
    Write-Host "[*] Limpiando directorio dist..." -ForegroundColor Yellow
    Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Generar Prisma Client
Write-Host "[*] Generando Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Ejecutar migraciones
Write-Host "[*] Ejecutando migraciones..." -ForegroundColor Yellow
npx prisma migrate deploy

# Iniciar backend en nueva ventana
$backendDir = $PWD.Path
$backendCommand = "cd '$backendDir'; `$env:PORT='9998'; Write-Host '=== BACKEND PICK & SURVIVE ===' -ForegroundColor Cyan; Write-Host 'Puerto: 9998' -ForegroundColor Gray; Write-Host 'Base de datos: PostgreSQL local (puerto 5432)' -ForegroundColor Gray; Write-Host ''; npm run start:dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
Write-Host "[OK] Backend iniciado en puerto 9998" -ForegroundColor Green
Set-Location ..

# Esperar un poco para que el backend inicie
Start-Sleep -Seconds 5

# Iniciar Frontend
Write-Host ""
Write-Host "[*] Iniciando Frontend (puerto 5174)..." -ForegroundColor Cyan
Set-Location $frontendPath

# Verificar node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Instalando dependencias del frontend..." -ForegroundColor Yellow
    npm install
}

# Iniciar frontend en nueva ventana
$frontendDir = $PWD.Path
$frontendCommand = "cd '$frontendDir'; Write-Host '=== FRONTEND PICK & SURVIVE ===' -ForegroundColor Cyan; Write-Host 'Puerto: 5174' -ForegroundColor Gray; Write-Host 'URL: http://localhost:5174' -ForegroundColor Gray; Write-Host ''; npm run dev -- -p 5174"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand
Write-Host "[OK] Frontend iniciado en puerto 5174" -ForegroundColor Green
Set-Location ..

# Esperar un poco para que ambos servicios inicien
Write-Host ""
Write-Host "[*] Esperando que los servicios inicien..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar que los servicios esten corriendo
Write-Host ""
Write-Host "[*] Verificando servicios..." -ForegroundColor Cyan

$backendOk = $false
$frontendOk = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:9998" -TimeoutSec 2 -ErrorAction Stop
    $backendOk = $true
    Write-Host "[OK] Backend respondiendo en http://localhost:9998" -ForegroundColor Green
} catch {
    Write-Host "[!] Backend aun no responde (puede tardar unos segundos mas)" -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5174" -TimeoutSec 2 -ErrorAction Stop
    $frontendOk = $true
    Write-Host "[OK] Frontend respondiendo en http://localhost:5174" -ForegroundColor Green
} catch {
    Write-Host "[!] Frontend aun no responde (puede tardar unos segundos mas)" -ForegroundColor Yellow
}

# Mostrar informacion final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SISTEMA INICIADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor White
Write-Host "   Backend:  http://localhost:9998" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5174" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credenciales de prueba:" -ForegroundColor White
Write-Host "   Email: antoniohermoso92@gmail.com" -ForegroundColor Cyan
Write-Host "   Contrasena: Antonio123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para detener los servicios, cierra las ventanas de PowerShell" -ForegroundColor Yellow
Write-Host ""

# Abrir navegador
Start-Sleep -Seconds 2
Start-Process "http://localhost:5174"

Write-Host "[OK] Navegador abierto" -ForegroundColor Green
Write-Host ""
