# 🚀 Guía: Migrar de pgAdmin Local a Supabase

## 📋 Paso 1: Obtener Connection String de Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto: `pickandsurvice`
3. Ve a **Settings** → **Database**
4. Busca la sección **Connection string** → **URI**
5. Copia la connection string (formato: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

**⚠️ Importante**: Reemplaza `[PASSWORD]` con tu contraseña real de Supabase.

## 📋 Paso 2: Configurar Prisma para Supabase

### Opción A: Usar Variable de Entorno Temporal

Crea un archivo `.env.supabase` en `pick-survive-backend/`:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

### Opción B: Usar Variable de Entorno del Sistema

En PowerShell:
```powershell
$env:DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

## 📋 Paso 3: Ejecutar Migraciones en Supabase

Desde el directorio `pick-survive-backend/`:

```powershell
# Si usaste Opción A (archivo .env.supabase)
Copy-Item .env.supabase .env

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones en Supabase
npx prisma migrate deploy
```

O si prefieres crear las tablas desde cero:

```powershell
# Resetear y aplicar todas las migraciones
npx prisma migrate reset --skip-seed
```

## 📋 Paso 4: Migrar Datos (Si tienes datos en local)

### 4.1 Exportar desde pgAdmin Local

1. Abre pgAdmin
2. Conecta a tu base de datos local
3. Click derecho en la base de datos → **Backup...**
4. Configura:
   - **Filename**: `backup-local.sql`
   - **Format**: `Plain`
   - **Encoding**: `UTF8`
   - **Dump Options** → Marca todas las opciones
5. Click **Backup**

### 4.2 Importar a Supabase

**Opción A: Desde pgAdmin**
1. En pgAdmin, crea una nueva conexión a Supabase:
   - **Host**: `db.xxxxx.supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: Tu contraseña de Supabase
2. Click derecho en la base de datos → **Restore...**
3. Selecciona el archivo `backup-local.sql`
4. Click **Restore**

**Opción B: Desde línea de comandos (psql)**
```powershell
# Instalar psql si no lo tienes (viene con PostgreSQL)
# O usar el psql de Supabase desde su dashboard

psql "postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres" -f backup-local.sql
```

**Opción C: Desde Supabase Dashboard**
1. Ve a **SQL Editor** en Supabase
2. Abre el archivo `backup-local.sql`
3. Copia y pega el contenido
4. Ejecuta el script

## 📋 Paso 5: Verificar la Migración

### En Supabase Dashboard:
1. Ve a **Table Editor**
2. Deberías ver todas las tablas creadas
3. Verifica que los datos estén presentes

### Con Prisma Studio:
```powershell
cd pick-survive-backend
npx prisma studio
```
Esto abrirá Prisma Studio en `http://localhost:5555` donde podrás ver y editar los datos.

## 📋 Paso 6: Actualizar Render (si ya lo tienes desplegado)

1. Ve a tu servicio backend en Render
2. **Environment Variables** → Edita `DATABASE_URL`
3. Pega la connection string de Supabase
4. Guarda y el servicio se redesplegará automáticamente

## 🔧 Troubleshooting

### Error: "relation already exists"
Si las tablas ya existen, puedes:
1. Eliminarlas manualmente desde Supabase Dashboard → SQL Editor:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```
2. Luego ejecutar `npx prisma migrate deploy` de nuevo

### Error: "password authentication failed"
- Verifica que la contraseña en la connection string sea correcta
- Puedes resetear la contraseña en Supabase → Settings → Database → Reset database password

### Error: "connection timeout"
- Verifica que la IP esté permitida en Supabase
- Ve a **Settings** → **Database** → **Connection Pooling**
- Usa el puerto `6543` para connection pooling si tienes problemas

## ✅ Checklist Final

- [ ] Connection string de Supabase obtenida
- [ ] Migraciones ejecutadas en Supabase
- [ ] Datos migrados (si aplica)
- [ ] Tablas visibles en Supabase Dashboard
- [ ] Prisma Studio conecta correctamente
- [ ] Render actualizado con nueva DATABASE_URL (si aplica)

---

**¡Listo!** Tu base de datos ahora está en Supabase de forma permanente. 🎉

