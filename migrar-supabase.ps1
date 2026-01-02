# Script para migrar base de datos a Supabase
# Uso: .\migrar-supabase.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$SupabasePassword
)

Write-Host "🚀 Migración a Supabase" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "pick-survive-backend")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Solicitar datos de Supabase si no se proporcionaron
if (-not $SupabaseUrl) {
    Write-Host "📋 Necesito la información de conexión de Supabase:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Ve a tu proyecto en Supabase Dashboard" -ForegroundColor White
    Write-Host "2. Settings → Database → Connection string → URI" -ForegroundColor White
    Write-Host "3. Copia la connection string completa" -ForegroundColor White
    Write-Host ""
    $SupabaseUrl = Read-Host "Pega la connection string de Supabase (postgresql://...)"
}

if (-not $SupabasePassword) {
    Write-Host ""
    $SupabasePassword = Read-Host "Ingresa la contraseña de Supabase (si no está en la URL)"
}

# Reemplazar [PASSWORD] si existe
if ($SupabaseUrl -match '\[PASSWORD\]') {
    if ($SupabasePassword) {
        $SupabaseUrl = $SupabaseUrl -replace '\[PASSWORD\]', $SupabasePassword
    } else {
        Write-Host "❌ Error: La URL contiene [PASSWORD] pero no proporcionaste la contraseña" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📝 Configurando Prisma..." -ForegroundColor Yellow

# Cambiar al directorio del backend
Push-Location pick-survive-backend

try {
    # Crear archivo .env temporal
    $envContent = "DATABASE_URL=`"$SupabaseUrl`""
    $envContent | Out-File -FilePath .env.supabase -Encoding utf8
    
    # Copiar a .env
    Copy-Item .env.supabase .env -Force
    
    Write-Host "✅ Archivo .env configurado" -ForegroundColor Green
    Write-Host ""
    
    # Generar Prisma Client
    Write-Host "🔧 Generando Prisma Client..." -ForegroundColor Yellow
    npx prisma generate
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error generando Prisma Client" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Prisma Client generado" -ForegroundColor Green
    Write-Host ""
    
    # Preguntar si quiere ejecutar migraciones
    Write-Host "📊 ¿Quieres ejecutar las migraciones ahora?" -ForegroundColor Yellow
    Write-Host "   Esto creará todas las tablas en Supabase" -ForegroundColor White
    $ejecutar = Read-Host "   (S/N)"
    
    if ($ejecutar -eq "S" -or $ejecutar -eq "s" -or $ejecutar -eq "Y" -or $ejecutar -eq "y") {
        Write-Host ""
        Write-Host "🚀 Ejecutando migraciones..." -ForegroundColor Yellow
        npx prisma migrate deploy
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error ejecutando migraciones" -ForegroundColor Red
            Write-Host "   Revisa los errores arriba" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "✅ Migraciones ejecutadas correctamente" -ForegroundColor Green
        Write-Host ""
    }
    
    # Preguntar si quiere ejecutar seed
    Write-Host "🌱 ¿Quieres ejecutar el seed (datos de ejemplo)?" -ForegroundColor Yellow
    $ejecutarSeed = Read-Host "   (S/N)"
    
    if ($ejecutarSeed -eq "S" -or $ejecutarSeed -eq "s" -or $ejecutarSeed -eq "Y" -or $ejecutarSeed -eq "y") {
        Write-Host ""
        Write-Host "🌱 Ejecutando seed..." -ForegroundColor Yellow
        npx prisma db seed
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Advertencia: El seed puede haber fallado, pero las migraciones están bien" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Seed ejecutado correctamente" -ForegroundColor Green
        }
        Write-Host ""
    }
    
    Write-Host "✅ ¡Migración completada!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Verifica las tablas en Supabase Dashboard → Table Editor" -ForegroundColor White
    Write-Host "   2. Actualiza DATABASE_URL en Render con la connection string de Supabase" -ForegroundColor White
    Write-Host "   3. Si tienes datos en local, expórtalos desde pgAdmin e impórtalos a Supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Para abrir Prisma Studio y ver los datos:" -ForegroundColor Yellow
    Write-Host "   cd pick-survive-backend" -ForegroundColor White
    Write-Host "   npx prisma studio" -ForegroundColor White
    
} finally {
    Pop-Location
}

