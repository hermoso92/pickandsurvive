# 📁 UBICACIÓN DE ARCHIVOS .env

## ❌ ESTADO ACTUAL

**No existen archivos `.env` en el proyecto.** Debes crearlos.

---

## 📍 UBICACIONES DONDE DEBEN ESTAR

### 1. Backend: `pick-survive-backend/.env`

**Ruta completa:**
```
pick-survive-backend\.env
```

**Contenido necesario:**

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public

# JWT Configuration
# IMPORTANTE: Genera un secreto seguro usando: openssl rand -hex 32
JWT_SECRET=TU_SECRETO_JWT_AQUI_CAMBIAR
JWT_EXPIRATION=60m

# Email Configuration (Gmail)
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password-de-gmail
EMAIL_FROM=noreply@pickandsurvive.com

# Football API Configuration
# Obtén tu token en: https://www.football-data.org/
FOOTBALL_DATA_TOKEN=tu-token-football-data-aqui

# Application Configuration
PORT=9998
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5174,http://localhost:3000,http://localhost:3002
FRONTEND_URL=http://localhost:5174
```

---

### 2. Frontend: `pick-survive-frontend/.env.local`

**Ruta completa:**
```
pick-survive-frontend\.env.local
```

**Contenido necesario:**

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:9998

# Environment
NODE_ENV=development
```

---

## 🔧 CÓMO CREAR LOS ARCHIVOS

### Opción 1: Crear manualmente

1. **Backend:**
   - Abre el directorio `pick-survive-backend`
   - Crea un archivo nuevo llamado `.env`
   - Copia el contenido de arriba
   - Actualiza `DATABASE_URL` con tus credenciales:
     ```
     DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public
     ```

2. **Frontend:**
   - Abre el directorio `pick-survive-frontend`
   - Crea un archivo nuevo llamado `.env.local`
   - Copia el contenido de arriba

### Opción 2: Usar PowerShell

**Backend:**
```powershell
cd pick-survive-backend

@"
DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public
JWT_SECRET=GENERA_UN_SECRETO_AQUI
JWT_EXPIRATION=60m
PORT=9998
NODE_ENV=development
CORS_ORIGIN=http://localhost:5174,http://localhost:3000,http://localhost:3002
FRONTEND_URL=http://localhost:5174
"@ | Out-File -FilePath .env -Encoding utf8
```

**Frontend:**
```powershell
cd pick-survive-frontend

@"
NEXT_PUBLIC_API_URL=http://localhost:9998
NODE_ENV=development
"@ | Out-File -FilePath .env.local -Encoding utf8
```

---

## 🔐 GENERAR JWT_SECRET

Antes de usar el `.env` del backend, genera un JWT_SECRET seguro:

```powershell
# Opción 1: Con OpenSSL
openssl rand -hex 32

# Opción 2: Con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y reemplázalo en `JWT_SECRET` del archivo `.env`.

---

## ✅ VERIFICAR QUE SE CREARON

```powershell
# Verificar backend
Test-Path pick-survive-backend\.env

# Verificar frontend
Test-Path pick-survive-frontend\.env.local

# Ver contenido (sin mostrar contraseñas)
Get-Content pick-survive-backend\.env | Select-String "DATABASE_URL"
```

---

## 📝 IMPORTANTE

### ⚠️ Seguridad

- ❌ **NUNCA** commitear archivos `.env` a Git
- ✅ Agregar a `.gitignore`:
  ```
  .env
  .env.local
  .env.*.local
  ```

### 📋 Variables Requeridas Mínimas

**Backend (mínimo para funcionar):**
```env
DATABASE_URL=postgresql://postgres:cosigein@localhost:5432/picksurvive?schema=public
JWT_SECRET=tu_secreto_generado
PORT=9998
```

**Frontend (mínimo para funcionar):**
```env
NEXT_PUBLIC_API_URL=http://localhost:9998
```

---

## 🚀 DESPUÉS DE CREAR LOS ARCHIVOS

1. **Backend:**
   ```powershell
   cd pick-survive-backend
   npx prisma generate
   npm run start:dev
   ```

2. **Frontend:**
   ```powershell
   cd pick-survive-frontend
   npm run dev -- -p 5174
   ```

---

**Última actualización:** $(Get-Date -Format "dd/MM/yyyy HH:mm")

