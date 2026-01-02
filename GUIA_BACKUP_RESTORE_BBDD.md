# 💾 GUÍA COMPLETA: BACKUP Y RESTAURACIÓN DE BASE DE DATOS
## Pick & Survive - PostgreSQL

**Fecha:** $(Get-Date -Format "dd/MM/yyyy")

---

## 📋 ÍNDICE

1. [Exportar Base de Datos desde Docker](#exportar-base-de-datos-desde-docker)
2. [Importar Base de Datos a Docker](#importar-base-de-datos-a-docker)
3. [Migrar de Docker a Base de Datos Externa](#migrar-de-docker-a-base-de-datos-externa)
4. [Backup Automático](#backup-automático)
5. [Restaurar desde Backup](#restaurar-desde-backup)

---

## 📤 EXPORTAR BASE DE DATOS DESDE DOCKER

### Opción 1: Exportar con pg_dump (Recomendado)

#### Paso 1: Verificar que el contenedor está corriendo

```powershell
docker ps | Select-String "pick-survive-db"
```

#### Paso 2: Exportar la base de datos

```powershell
# Exportar a archivo SQL
docker exec pick-survive-db pg_dump -U admin picksurvive > backup_picksurvive_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# O con formato personalizado (más eficiente)
docker exec pick-survive-db pg_dump -U admin -F c -f /tmp/backup.dump picksurvive
docker cp pick-survive-db:/tmp/backup.dump ./backup_picksurvive_$(Get-Date -Format "yyyyMMdd_HHmmss").dump
```

#### Paso 3: Verificar que el archivo se creó

```powershell
ls -la backup_picksurvive_*.sql
```

### Opción 2: Exportar solo el esquema (sin datos)

```powershell
# Solo estructura
docker exec pick-survive-db pg_dump -U admin -s picksurvive > schema_only.sql

# Solo datos
docker exec pick-survive-db pg_dump -U admin -a picksurvive > data_only.sql
```

### Opción 3: Exportar a formato CSV (para análisis)

```powershell
# Exportar tabla específica
docker exec pick-survive-db psql -U admin -d picksurvive -c "\COPY (SELECT * FROM \"User\") TO '/tmp/users.csv' CSV HEADER"
docker cp pick-survive-db:/tmp/users.csv ./users.csv
```

---

## 📥 IMPORTAR BASE DE DATOS A DOCKER

### Opción 1: Importar desde archivo SQL

```powershell
# Copiar archivo al contenedor
docker cp backup_picksurvive.sql pick-survive-db:/tmp/backup.sql

# Importar
docker exec -i pick-survive-db psql -U admin -d picksurvive < backup_picksurvive.sql

# O directamente desde archivo local
Get-Content backup_picksurvive.sql | docker exec -i pick-survive-db psql -U admin -d picksurvive
```

### Opción 2: Importar desde dump personalizado

```powershell
# Copiar dump al contenedor
docker cp backup_picksurvive.dump pick-survive-db:/tmp/backup.dump

# Restaurar
docker exec pick-survive-db pg_restore -U admin -d picksurvive -c /tmp/backup.dump
```

### Opción 3: Restaurar en base de datos limpia

```powershell
# 1. Eliminar base de datos existente
docker exec pick-survive-db psql -U admin -c "DROP DATABASE IF EXISTS picksurvive;"

# 2. Crear base de datos nueva
docker exec pick-survive-db psql -U admin -c "CREATE DATABASE picksurvive;"

# 3. Importar backup
Get-Content backup_picksurvive.sql | docker exec -i pick-survive-db psql -U admin -d picksurvive
```

---

## 🔄 MIGRAR DE DOCKER A BASE DE DATOS EXTERNA

### Paso 1: Exportar desde Docker

```powershell
# Exportar base de datos completa
docker exec pick-survive-db pg_dump -U admin picksurvive > backup_para_migracion.sql
```

### Paso 2: Crear base de datos en servidor externo

```sql
-- Conectarse a PostgreSQL externo
CREATE DATABASE picksurvive;
```

### Paso 3: Importar en servidor externo

```powershell
# Opción A: Desde archivo local
psql -h servidor.com -U usuario -d picksurvive -f backup_para_migracion.sql

# Opción B: Usando pgAdmin o herramienta gráfica
# Importar el archivo .sql
```

### Paso 4: Actualizar .env

```env
# Cambiar DATABASE_URL
DATABASE_URL=postgresql://usuario:password@servidor.com:5432/picksurvive?schema=public
```

### Paso 5: Verificar conexión

```powershell
cd pick-survive-backend
npx prisma db pull
```

---

## 🔄 MIGRAR DE BASE DE DATOS EXTERNA A DOCKER

### Paso 1: Exportar desde servidor externo

```powershell
# Desde tu máquina local
pg_dump -h servidor.com -U usuario -d picksurvive > backup_externo.sql

# O desde el servidor
pg_dump -U usuario picksurvive > backup_externo.sql
```

### Paso 2: Importar a Docker

```powershell
# Asegurarse de que Docker está corriendo
docker-compose up -d

# Importar
Get-Content backup_externo.sql | docker exec -i pick-survive-db psql -U admin -d picksurvive
```

---

## 🔄 MIGRAR DE DOCKER A DOCKER (Nuevo Contenedor)

### Si necesitas mover datos a otro contenedor Docker:

```powershell
# 1. Exportar desde contenedor origen
docker exec pick-survive-db pg_dump -U admin picksurvive > backup.sql

# 2. Crear nuevo contenedor (si es necesario)
docker-compose down
docker-compose up -d

# 3. Importar en nuevo contenedor
Get-Content backup.sql | docker exec -i pick-survive-db psql -U admin -d picksurvive
```

---

## 📦 BACKUP AUTOMÁTICO

### Script PowerShell para Backup Automático

Crea un archivo `backup-db.ps1`:

```powershell
# backup-db.ps1
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = ".\backups"
$backupFile = "$backupDir\backup_picksurvive_$timestamp.sql"

# Crear directorio de backups si no existe
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

Write-Host "🔄 Iniciando backup de base de datos..." -ForegroundColor Cyan

# Verificar que el contenedor está corriendo
$container = docker ps --filter "name=pick-survive-db" --format "{{.Names}}"
if (-not $container) {
    Write-Host "❌ Error: Contenedor pick-survive-db no está corriendo" -ForegroundColor Red
    exit 1
}

# Exportar base de datos
Write-Host "📤 Exportando base de datos..." -ForegroundColor Yellow
docker exec pick-survive-db pg_dump -U admin picksurvive > $backupFile

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $backupFile).Length / 1MB
    Write-Host "✅ Backup completado: $backupFile" -ForegroundColor Green
    Write-Host "   Tamaño: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
    
    # Mantener solo los últimos 10 backups
    Get-ChildItem $backupDir -Filter "backup_picksurvive_*.sql" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -Skip 10 | 
        Remove-Item
    
    Write-Host "✅ Limpieza de backups antiguos completada" -ForegroundColor Green
} else {
    Write-Host "❌ Error al crear backup" -ForegroundColor Red
    exit 1
}
```

### Usar el script:

```powershell
.\backup-db.ps1
```

### Programar backup automático (Windows Task Scheduler)

1. Abre "Programador de tareas"
2. Crear tarea básica
3. Nombre: "Backup Pick & Survive DB"
4. Disparador: Diario a las 2:00 AM
5. Acción: Iniciar programa
   - Programa: `powershell.exe`
   - Argumentos: `-File "C:\ruta\al\proyecto\backup-db.ps1"`

---

## 🔄 RESTAURAR DESDE BACKUP

### Opción 1: Restaurar completo (reemplaza todo)

```powershell
# 1. Detener aplicación (opcional pero recomendado)
docker-compose stop

# 2. Eliminar base de datos actual
docker exec pick-survive-db psql -U admin -c "DROP DATABASE IF EXISTS picksurvive;"
docker exec pick-survive-db psql -U admin -c "CREATE DATABASE picksurvive;"

# 3. Restaurar backup
Get-Content backup_picksurvive_20250101_120000.sql | docker exec -i pick-survive-db psql -U admin -d picksurvive

# 4. Reiniciar aplicación
docker-compose start
```

### Opción 2: Restaurar solo datos (mantener estructura)

```powershell
# Si el backup tiene solo datos (sin CREATE TABLE)
Get-Content data_only.sql | docker exec -i pick-survive-db psql -U admin -d picksurvive
```

---

## 🔍 VERIFICAR CONTENIDO DE LA BASE DE DATOS

### Ver tablas

```powershell
docker exec pick-survive-db psql -U admin -d picksurvive -c "\dt"
```

### Ver datos de una tabla

```powershell
# Ver usuarios
docker exec pick-survive-db psql -U admin -d picksurvive -c "SELECT id, email, alias FROM \"User\" LIMIT 10;"

# Ver ligas
docker exec pick-survive-db psql -U admin -d picksurvive -c "SELECT id, name, \"ownerUserId\" FROM \"League\" LIMIT 10;"

# Ver ediciones
docker exec pick-survive-db psql -U admin -d picksurvive -c "SELECT id, name, status, \"potCents\" FROM \"Edition\" LIMIT 10;"
```

### Contar registros

```powershell
docker exec pick-survive-db psql -U admin -d picksurvive -c "
SELECT 
    'User' as tabla, COUNT(*) as registros FROM \"User\"
UNION ALL
SELECT 'League', COUNT(*) FROM \"League\"
UNION ALL
SELECT 'Edition', COUNT(*) FROM \"Edition\"
UNION ALL
SELECT 'Participant', COUNT(*) FROM \"Participant\"
UNION ALL
SELECT 'Pick', COUNT(*) FROM \"Pick\"
UNION ALL
SELECT 'Match', COUNT(*) FROM \"Match\"
UNION ALL
SELECT 'Ledger', COUNT(*) FROM \"Ledger\";
"
```

---

## 🛠️ HERRAMIENTAS ÚTILES

### pgAdmin (Interfaz Gráfica)

1. Descargar: https://www.pgadmin.org/download/
2. Conectar a Docker:
   - Host: `localhost`
   - Puerto: `5432`
   - Usuario: `admin`
   - Contraseña: `supersecret`
   - Base de datos: `picksurvive`

### DBeaver (Gratis, Multiplataforma)

1. Descargar: https://dbeaver.io/download/
2. Nueva conexión → PostgreSQL
3. Misma configuración que pgAdmin

### psql (Línea de comandos)

```powershell
# Conectarse directamente
docker exec -it pick-survive-db psql -U admin -d picksurvive

# Desde aquí puedes ejecutar SQL:
SELECT * FROM "User";
\q  # Salir
```

---

## 📝 EJEMPLOS PRÁCTICOS

### Ejemplo 1: Backup antes de actualizar

```powershell
# 1. Hacer backup
.\backup-db.ps1

# 2. Actualizar código
git pull

# 3. Ejecutar migraciones
cd pick-survive-backend
npx prisma migrate deploy

# 4. Si algo falla, restaurar:
Get-Content .\backups\backup_picksurvive_YYYYMMDD_HHMMSS.sql | docker exec -i pick-survive-db psql -U admin -d picksurvive
```

### Ejemplo 2: Exportar solo datos de producción

```powershell
# Exportar sin estructura (solo INSERT)
docker exec pick-survive-db pg_dump -U admin -a --column-inserts picksurvive > datos_produccion.sql
```

### Ejemplo 3: Clonar base de datos para testing

```powershell
# 1. Crear nueva base de datos
docker exec pick-survive-db psql -U admin -c "CREATE DATABASE picksurvive_test;"

# 2. Exportar desde producción
docker exec pick-survive-db pg_dump -U admin picksurvive > temp_backup.sql

# 3. Importar en test
Get-Content temp_backup.sql | docker exec -i pick-survive-db psql -U admin -d picksurvive_test

# 4. Limpiar
Remove-Item temp_backup.sql
```

---

## ⚠️ NOTAS IMPORTANTES

### Seguridad

- ⚠️ **NUNCA** commitear archivos de backup con datos reales
- ⚠️ **NUNCA** compartir backups con contraseñas
- ✅ Usar `.gitignore` para excluir `backups/`
- ✅ Encriptar backups si contienen datos sensibles

### Performance

- 📦 Backups grandes pueden tardar varios minutos
- 💾 Formato `.dump` es más eficiente que `.sql`
- 🔄 Para bases grandes, considerar backup incremental

### Mejores Prácticas

1. ✅ Hacer backup antes de migraciones importantes
2. ✅ Verificar backups periódicamente (restaurar en test)
3. ✅ Mantener múltiples versiones de backup
4. ✅ Documentar fecha y propósito de cada backup
5. ✅ Automatizar backups diarios

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Error: "container not found"

```powershell
# Verificar contenedores
docker ps -a

# Si no existe, iniciar
cd pick-survive-backend
docker-compose up -d
```

### Error: "permission denied"

```powershell
# En Windows, puede necesitar ejecutar como administrador
# O verificar permisos de Docker
```

### Error: "database does not exist"

```powershell
# Crear base de datos
docker exec pick-survive-db psql -U admin -c "CREATE DATABASE picksurvive;"
```

### Backup muy grande

```powershell
# Usar compresión
docker exec pick-survive-db pg_dump -U admin -F c -Z 9 picksurvive > backup.dump

# O exportar solo estructura y datos por separado
docker exec pick-survive-db pg_dump -U admin -s picksurvive > schema.sql
docker exec pick-survive-db pg_dump -U admin -a picksurvive > data.sql
```

---

**Documento creado:** $(Get-Date -Format "dd/MM/yyyy HH:mm")  
**Última actualización:** $(Get-Date -Format "dd/MM/yyyy HH:mm")

