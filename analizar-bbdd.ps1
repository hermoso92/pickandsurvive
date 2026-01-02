# Script para analizar la base de datos picksurvive
# Verifica estructura, tablas, relaciones y datos

param(
    [string]$Host = "localhost",
    [int]$Port = 5432,
    [string]$Database = "picksurvive",
    [string]$User = "postgres",
    [string]$Password = "cosigein"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ANÁLISIS DE BASE DE DATOS" -ForegroundColor Cyan
Write-Host "  Pick & Survive" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurar variable de entorno para contraseña
$env:PGPASSWORD = $Password

Write-Host "🔍 Conectando a la base de datos..." -ForegroundColor Yellow
Write-Host "   Host: $Host" -ForegroundColor Gray
Write-Host "   Puerto: $Port" -ForegroundColor Gray
Write-Host "   Base de datos: $Database" -ForegroundColor Gray
Write-Host "   Usuario: $User" -ForegroundColor Gray
Write-Host ""

# Verificar conexión
$testConnection = psql -h $Host -p $Port -U $User -d $Database -c "SELECT version();" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al conectar a la base de datos" -ForegroundColor Red
    Write-Host $testConnection -ForegroundColor Red
    exit 1
}

Write-Host "✅ Conexión exitosa" -ForegroundColor Green
Write-Host ""

# Tablas esperadas según schema.prisma
$tablasEsperadas = @(
    "User",
    "League",
    "LeagueMember",
    "LeagueInvite",
    "Edition",
    "Participant",
    "Ledger",
    "Team",
    "Match",
    "Pick"
)

Write-Host "📊 ANALIZANDO ESTRUCTURA..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar tablas existentes
Write-Host "1️⃣ Verificando tablas..." -ForegroundColor Yellow
$tablasQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
$tablasExistentes = psql -h $Host -p $Port -U $User -d $Database -t -A -c $tablasQuery

$tablasList = $tablasExistentes -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }

Write-Host "   Tablas encontradas: $($tablasList.Count)" -ForegroundColor Gray
foreach ($tabla in $tablasList) {
    Write-Host "   ✅ $tabla" -ForegroundColor Green
}

Write-Host ""

# Verificar tablas faltantes
$tablasFaltantes = $tablasEsperadas | Where-Object { $tablasList -notcontains $_ }
if ($tablasFaltantes.Count -gt 0) {
    Write-Host "   ⚠️  Tablas faltantes:" -ForegroundColor Yellow
    foreach ($tabla in $tablasFaltantes) {
        Write-Host "   ❌ $tabla" -ForegroundColor Red
    }
} else {
    Write-Host "   ✅ Todas las tablas esperadas están presentes" -ForegroundColor Green
}

Write-Host ""

# 2. Contar registros por tabla
Write-Host "2️⃣ Contando registros por tabla..." -ForegroundColor Yellow
foreach ($tabla in $tablasList) {
    $countQuery = "SELECT COUNT(*) FROM `"$tabla`";"
    $count = psql -h $Host -p $Port -U $User -d $Database -t -A -c $countQuery
    $count = $count.Trim()
    Write-Host "   $tabla : $count registros" -ForegroundColor Gray
}

Write-Host ""

# 3. Verificar estructura de tablas clave
Write-Host "3️⃣ Verificando estructura de tablas clave..." -ForegroundColor Yellow

# User
Write-Host "   📋 Tabla User:" -ForegroundColor Cyan
$userColumns = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position;"
$userColumns -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
    $parts = $_ -split '\|'
    Write-Host "      - $($parts[0].Trim()) : $($parts[1].Trim())" -ForegroundColor Gray
}

# League
Write-Host "   📋 Tabla League:" -ForegroundColor Cyan
$leagueColumns = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'League' ORDER BY ordinal_position;"
$leagueColumns -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
    $parts = $_ -split '\|'
    Write-Host "      - $($parts[0].Trim()) : $($parts[1].Trim())" -ForegroundColor Gray
}

# Edition
Write-Host "   📋 Tabla Edition:" -ForegroundColor Cyan
$editionColumns = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Edition' ORDER BY ordinal_position;"
$editionColumns -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
    $parts = $_ -split '\|'
    Write-Host "      - $($parts[0].Trim()) : $($parts[1].Trim())" -ForegroundColor Gray
}

Write-Host ""

# 4. Verificar índices
Write-Host "4️⃣ Verificando índices..." -ForegroundColor Yellow
$indexes = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;"
$indexList = $indexes -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }
Write-Host "   Índices encontrados: $($indexList.Count)" -ForegroundColor Gray
foreach ($index in $indexList) {
    Write-Host "   ✅ $index" -ForegroundColor Green
}

Write-Host ""

# 5. Verificar foreign keys
Write-Host "5️⃣ Verificando relaciones (Foreign Keys)..." -ForegroundColor Yellow
$fks = psql -h $Host -p $Port -U $User -d $Database -t -A -c @"
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
ORDER BY tc.table_name, kcu.column_name;
"@

$fkList = $fks -split "`n" | Where-Object { $_.Trim() -ne "" }
Write-Host "   Relaciones encontradas: $($fkList.Count)" -ForegroundColor Gray
foreach ($fk in $fkList) {
    $parts = $fk -split '\|'
    if ($parts.Count -eq 4) {
        Write-Host "   ✅ $($parts[0].Trim()).$($parts[1].Trim()) -> $($parts[2].Trim()).$($parts[3].Trim())" -ForegroundColor Green
    }
}

Write-Host ""

# 6. Verificar datos de ejemplo
Write-Host "6️⃣ Verificando datos de ejemplo..." -ForegroundColor Yellow

# Usuarios
$userCount = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT COUNT(*) FROM \"User\";"
$userCount = $userCount.Trim()
if ([int]$userCount -gt 0) {
    Write-Host "   👤 Usuarios: $userCount" -ForegroundColor Green
    $sampleUsers = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT id, email, alias FROM \"User\" LIMIT 3;"
    $sampleUsers -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
        $parts = $_ -split '\|'
        Write-Host "      - $($parts[1].Trim()) ($($parts[2].Trim()))" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  No hay usuarios" -ForegroundColor Yellow
}

# Ligas
$leagueCount = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT COUNT(*) FROM \"League\";"
$leagueCount = $leagueCount.Trim()
Write-Host "   🏆 Ligas: $leagueCount" -ForegroundColor $(if ([int]$leagueCount -gt 0) { "Green" } else { "Yellow" })

# Ediciones
$editionCount = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT COUNT(*) FROM \"Edition\";"
$editionCount = $editionCount.Trim()
Write-Host "   🎮 Ediciones: $editionCount" -ForegroundColor $(if ([int]$editionCount -gt 0) { "Green" } else { "Yellow" })

Write-Host ""

# 7. Verificar migraciones de Prisma
Write-Host "7️⃣ Verificando migraciones de Prisma..." -ForegroundColor Yellow
$migrationTable = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations');"
if ($migrationTable -match "t") {
    Write-Host "   ✅ Tabla _prisma_migrations existe" -ForegroundColor Green
    $migrations = psql -h $Host -p $Port -U $User -d $Database -t -A -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"
    Write-Host "   Últimas migraciones:" -ForegroundColor Gray
    $migrations -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
        $parts = $_ -split '\|'
        Write-Host "      - $($parts[0].Trim()) ($($parts[1].Trim()))" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  Tabla _prisma_migrations no existe" -ForegroundColor Yellow
}

Write-Host ""

# Resumen final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DEL ANÁLISIS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$estado = "✅ CORRECTA"
if ($tablasFaltantes.Count -gt 0) {
    $estado = "⚠️  INCOMPLETA"
}

Write-Host "Estado general: $estado" -ForegroundColor $(if ($tablasFaltantes.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host "Tablas esperadas: $($tablasEsperadas.Count)" -ForegroundColor Gray
Write-Host "Tablas encontradas: $($tablasList.Count)" -ForegroundColor Gray
Write-Host "Tablas faltantes: $($tablasFaltantes.Count)" -ForegroundColor $(if ($tablasFaltantes.Count -eq 0) { "Green" } else { "Red" })

Write-Host ""

if ($tablasFaltantes.Count -eq 0) {
    Write-Host "✅ La base de datos tiene la estructura correcta" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Actualizar .env con las nuevas credenciales:" -ForegroundColor White
    Write-Host "      DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public" -ForegroundColor Gray
    Write-Host "   2. Ejecutar: npx prisma generate" -ForegroundColor White
    Write-Host "   3. Verificar conexión desde la aplicación" -ForegroundColor White
} else {
    Write-Host "⚠️  Faltan tablas. Ejecuta las migraciones:" -ForegroundColor Yellow
    Write-Host "   cd pick-survive-backend" -ForegroundColor White
    Write-Host "   npx prisma migrate deploy" -ForegroundColor White
}

Write-Host ""

# Limpiar variable de entorno
Remove-Item Env:\PGPASSWORD

