# 🔧 SOLUCIÓN: Backup Corrupto o Formato Incorrecto

## ❌ Problema Detectado

El archivo `backup.sql` está corrupto o no es un archivo SQL válido. Además, estás usando `pg_restore` que es para archivos binarios (`.dump`), no para archivos SQL (`.sql`).

---

## ✅ SOLUCIÓN: Exportar Correctamente desde Docker

### Opción 1: Exportar como SQL (Recomendado para pgAdmin)

```powershell
# 1. Verificar que Docker está corriendo
docker ps | Select-String "pick-survive-db"

# 2. Exportar como SQL plano (correcto para pgAdmin)
docker exec pick-survive-db pg_dump -U admin -F p picksurvive > backup_correcto.sql

# 3. Verificar que el archivo se creó correctamente
Get-Content backup_correcto.sql | Select-Object -First 10
```

**Deberías ver algo como:**
```sql
--
-- PostgreSQL database dump
--
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
...
```

### Opción 2: Exportar como Dump Binario (Para pg_restore)

```powershell
# Exportar en formato binario
docker exec pick-survive-db pg_dump -U admin -F c -f /tmp/backup.dump picksurvive

# Copiar del contenedor a tu máquina
docker cp pick-survive-db:/tmp/backup.dump ./backup.dump
```

---

## 📥 IMPORTAR EN POSTGRESQL LOCAL

### Si tienes archivo SQL (`.sql`):

**Opción A: Usando psql (Línea de comandos)**

```powershell
# Conectarse y restaurar
psql -h localhost -U postgres -d pickandsurvive -f backup_correcto.sql

# O si necesitas crear la base de datos primero:
psql -h localhost -U postgres -c "CREATE DATABASE pickandsurvive;"
psql -h localhost -U postgres -d pickandsurvive -f backup_correcto.sql
```

**Opción B: Usando pgAdmin (Interfaz Gráfica)**

1. Abre pgAdmin
2. Conecta a tu servidor PostgreSQL
3. Click derecho en la base de datos `pickandsurvive` → **Restore...**
4. En "Filename", selecciona tu archivo `backup_correcto.sql`
5. **IMPORTANTE**: En "Format", selecciona **"Plain"** (no "Custom" o "Directory")
6. Click "Restore"

### Si tienes archivo Dump (`.dump`):

**Usando pg_restore (lo que estabas intentando):**

```powershell
# Restaurar desde dump binario
pg_restore -h localhost -U postgres -d pickandsurvive -v backup.dump
```

**O en pgAdmin:**
1. Click derecho en base de datos → **Restore...**
2. Selecciona `backup.dump`
3. En "Format", selecciona **"Custom"**
4. Click "Restore"

---

## 🔍 VERIFICAR QUE EL BACKUP ES VÁLIDO

### Verificar archivo SQL:

```powershell
# Ver primeras líneas (debe empezar con comentarios SQL)
Get-Content backup_correcto.sql | Select-Object -First 20

# Debe contener algo como:
# -- PostgreSQL database dump
# SET statement_timeout = 0;
# CREATE TABLE ...
```

### Verificar archivo Dump:

```powershell
# Verificar que es un archivo binario válido
file backup.dump

# O intentar listar contenido
pg_restore -l backup.dump
```

---

## 🚨 SI EL ARCHIVO SIGUE CORRUPTO

### Paso 1: Eliminar archivo corrupto

```powershell
Remove-Item backup.sql -ErrorAction SilentlyContinue
```

### Paso 2: Exportar de nuevo desde Docker

```powershell
# Asegurarse de que Docker está corriendo
cd pick-survive-backend
docker-compose up -d

# Esperar 5 segundos
Start-Sleep -Seconds 5

# Exportar correctamente
docker exec pick-survive-db pg_dump -U admin -F p --clean --if-exists picksurvive > backup_nuevo.sql

# Verificar tamaño (debe ser > 0 bytes)
(Get-Item backup_nuevo.sql).Length
```

### Paso 3: Verificar contenido

```powershell
# Debe tener al menos estas líneas al inicio
Get-Content backup_nuevo.sql | Select-Object -First 5
```

---

## 📋 PROCESO COMPLETO PASO A PASO

### Desde Docker a PostgreSQL Local:

```powershell
# 1. Exportar desde Docker
docker exec pick-survive-db pg_dump -U admin -F p --clean --if-exists picksurvive > backup_final.sql

# 2. Verificar archivo
Write-Host "Tamaño: $((Get-Item backup_final.sql).Length) bytes"
Get-Content backup_final.sql | Select-Object -First 10

# 3. Crear base de datos en PostgreSQL local (si no existe)
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS pickandsurvive;"
psql -h localhost -U postgres -c "CREATE DATABASE pickandsurvive;"

# 4. Importar
psql -h localhost -U postgres -d pickandsurvive -f backup_final.sql

# 5. Verificar
psql -h localhost -U postgres -d pickandsurvive -c "\dt"
```

---

## 🛠️ ALTERNATIVA: Usar Script Automático

He creado `backup-db.ps1` que exporta correctamente:

```powershell
# Ejecutar script
.\backup-db.ps1

# El backup estará en: .\backups\backup_picksurvive_YYYYMMDD_HHMMSS.sql
```

Luego importar en pgAdmin:
1. Abre pgAdmin
2. Restore → Selecciona el archivo de `backups/`
3. Format: **Plain**
4. Restore

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### Error: "input file does not appear to be a valid archive"

**Causa:** Estás usando `pg_restore` con un archivo `.sql` (texto plano)

**Solución:**
- Si es `.sql` → Usa `psql` o pgAdmin con formato "Plain"
- Si es `.dump` → Usa `pg_restore` o pgAdmin con formato "Custom"

### Error: "file too short"

**Causa:** Archivo corrupto o vacío

**Solución:**
```powershell
# Eliminar y exportar de nuevo
Remove-Item backup.sql
docker exec pick-survive-db pg_dump -U admin picksurvive > backup.sql
```

### Error: "database does not exist"

**Solución:**
```powershell
# Crear base de datos primero
psql -h localhost -U postgres -c "CREATE DATABASE pickandsurvive;"
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de restaurar, verifica:

- [ ] Docker está corriendo
- [ ] Archivo SQL tiene contenido (no está vacío)
- [ ] Archivo empieza con comentarios SQL (`--`)
- [ ] Base de datos existe en PostgreSQL local
- [ ] Tienes permisos para restaurar
- [ ] Formato correcto en pgAdmin (Plain para .sql, Custom para .dump)

---

**Última actualización:** $(Get-Date -Format "dd/MM/yyyy HH:mm")

