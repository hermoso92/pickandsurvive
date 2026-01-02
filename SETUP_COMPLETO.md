# 🚀 GUÍA COMPLETA DE SETUP - PICK & SURVIVE

## 📋 Índice
1. [Requisitos Previos](#requisitos-previos)
2. [Configuración Inicial](#configuración-inicial)
3. [Inicio del Sistema](#inicio-del-sistema)
4. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
5. [Base de Datos](#base-de-datos)
6. [Estructura del Proyecto](#estructura-del-proyecto)
7. [Puertos y URLs](#puertos-y-urls)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Requisitos Previos

### Software Necesario
- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker Desktop** (para base de datos PostgreSQL)
- **Git**
- **PowerShell** (Windows)

### Verificar Instalación
```powershell
node --version
npm --version
docker --version
```

---

## ⚙️ Configuración Inicial

### 1. Clonar/Verificar el Proyecto
```powershell
# Asegúrate de estar en el directorio raíz del proyecto
cd "C:\Users\Cosigein SL\Desktop\pickandsurvive\pickandsurvive - copia"
```

### 2. Instalar Dependencias

#### Backend
```powershell
cd pick-survive-backend
npm install
```

#### Frontend
```powershell
cd ..\pick-survive-frontend
npm install
```

---

## 🔐 Configuración de Variables de Entorno

### Backend (.env)

Crea el archivo `pick-survive-backend/.env` con el siguiente contenido:

```env
# Database Configuration
DATABASE_URL=postgresql://admin:supersecret@localhost:5432/picksurvive?schema=public

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

### Generar JWT_SECRET

```powershell
# Opción 1: Con OpenSSL
openssl rand -hex 32

# Opción 2: Con Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y reemplázalo en `JWT_SECRET` del archivo `.env`.

### Frontend (.env.local)

Crea el archivo `pick-survive-frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:9998

# Environment
NODE_ENV=development
```

---

## 🗄️ Base de Datos

### Iniciar PostgreSQL con Docker

El proyecto incluye un `docker-compose.yml` para la base de datos:

```powershell
cd pick-survive-backend
docker-compose up -d
```

Esto iniciará PostgreSQL en el puerto **5432** con:
- **Usuario:** admin
- **Contraseña:** supersecret
- **Base de datos:** picksurvive

### Ejecutar Migraciones

```powershell
cd pick-survive-backend
npx prisma generate
npx prisma migrate deploy
```

### Crear Usuario Maestro (Opcional)

```powershell
cd pick-survive-backend
node create-master-user.js
```

---

## 🚀 Inicio del Sistema

### Método Recomendado: Script Automático

El proyecto incluye un script `iniciar.ps1` que:
- ✅ Libera puertos automáticamente (9998, 5174)
- ✅ Verifica Docker y base de datos
- ✅ Inicia backend y frontend en ventanas separadas
- ✅ Abre el navegador automáticamente

```powershell
# Desde el directorio raíz del proyecto
.\iniciar.ps1
```

### Método Manual

#### Terminal 1: Backend
```powershell
cd pick-survive-backend
$env:PORT=9998
npm run start:dev
```

#### Terminal 2: Frontend
```powershell
cd pick-survive-frontend
npm run dev -- -p 5174
```

---

## 📁 Estructura del Proyecto

```
pickandsurvive/
├── pick-survive-backend/          # Backend NestJS
│   ├── src/
│   │   ├── auth/                  # Autenticación JWT
│   │   ├── users/                 # Gestión de usuarios
│   │   ├── leagues/               # Sistema de ligas
│   │   ├── editions/              # Ediciones del juego
│   │   ├── picks/                 # Selecciones de usuarios
│   │   ├── matches/               # Partidos de fútbol
│   │   ├── prisma/                # Servicio Prisma
│   │   └── ...
│   ├── prisma/
│   │   ├── schema.prisma          # Esquema de base de datos
│   │   └── migrations/            # Migraciones
│   ├── docker-compose.yml         # Configuración Docker
│   └── .env                       # Variables de entorno
│
├── pick-survive-frontend/         # Frontend Next.js
│   ├── src/
│   │   ├── app/                   # Páginas Next.js
│   │   ├── components/            # Componentes React
│   │   ├── hooks/                 # Custom hooks
│   │   ├── config/                # Configuración (API, etc.)
│   │   └── utils/                 # Utilidades (logger, etc.)
│   └── .env.local                 # Variables de entorno
│
└── iniciar.ps1                    # Script de inicio automático
```

---

## 🌐 Puertos y URLs

### Puertos Fijos (No Cambiar)

- **Backend:** `9998`
- **Frontend:** `5174`
- **PostgreSQL:** `5432`

### URLs de Acceso

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:9998
- **API Docs:** http://localhost:9998 (si está configurado)

---

## 🔍 Verificación del Sistema

### Verificar Backend
```powershell
# Debe responder con status 200
Invoke-WebRequest -Uri "http://localhost:9998" -Method GET
```

### Verificar Frontend
```powershell
# Debe responder con HTML
Invoke-WebRequest -Uri "http://localhost:5174" -Method GET
```

### Verificar Base de Datos
```powershell
# Verificar contenedor Docker
docker ps | Select-String "pick-survive-db"
```

---

## 🐛 Troubleshooting

### Error: Puerto en Uso

**Solución:** El script `iniciar.ps1` libera puertos automáticamente. Si persiste:

```powershell
# Liberar puerto 9998 manualmente
$process = Get-NetTCPConnection -LocalPort 9998 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) { Stop-Process -Id $process -Force }

# Liberar puerto 5174 manualmente
$process = Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) { Stop-Process -Id $process -Force }
```

### Error: JWT_SECRET no encontrado

**Solución:** Asegúrate de que el archivo `.env` existe y tiene `JWT_SECRET` configurado:

```powershell
# Verificar
Get-Content pick-survive-backend\.env | Select-String "JWT_SECRET"
```

### Error: Base de Datos no Conecta

**Solución:**

1. Verificar que Docker está corriendo:
```powershell
docker ps
```

2. Reiniciar contenedor:
```powershell
cd pick-survive-backend
docker-compose down
docker-compose up -d
```

3. Verificar conexión:
```powershell
# Desde el backend
cd pick-survive-backend
npx prisma db pull
```

### Error: CORS en Frontend

**Solución:** Verificar que `CORS_ORIGIN` en `.env` incluye `http://localhost:5174`:

```env
CORS_ORIGIN=http://localhost:5174,http://localhost:3000,http://localhost:3002
```

### Error: Módulos no Encontrados

**Solución:** Reinstalar dependencias:

```powershell
# Backend
cd pick-survive-backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Frontend
cd ..\pick-survive-frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## 📝 Notas Importantes

### Reglas del Proyecto

1. **NUNCA hardcodear URLs** - Usar siempre `frontend/src/config/api.ts`
2. **NUNCA usar console.log** - Usar siempre `logger` de `utils/logger`
3. **Puertos fijos** - Backend: 9998, Frontend: 5174
4. **Siempre usar iniciar.ps1** - No iniciar servicios manualmente
5. **Variables de entorno** - Nunca commitear archivos `.env`

### Logging

- **Backend:** Usar `Logger` de `@nestjs/common`
- **Frontend:** Usar `createLogger` de `utils/logger`

### Prisma

- **Siempre usar PrismaService** - No crear instancias directas de PrismaClient
- **PrismaModule es Global** - No necesitas importarlo en cada módulo

---

## ✅ Checklist de Verificación

Antes de considerar el proyecto listo:

- [ ] Node.js y npm instalados
- [ ] Docker Desktop instalado y corriendo
- [ ] Dependencias instaladas (backend y frontend)
- [ ] Archivo `.env` creado en backend con `JWT_SECRET` generado
- [ ] Archivo `.env.local` creado en frontend
- [ ] Base de datos PostgreSQL corriendo (Docker)
- [ ] Migraciones ejecutadas
- [ ] Backend inicia sin errores en puerto 9998
- [ ] Frontend inicia sin errores en puerto 5174
- [ ] Navegador abre automáticamente en http://localhost:5174
- [ ] Login/Registro funcionan correctamente

---

## 📞 Soporte

Si encuentras problemas:

1. Revisar logs del backend (terminal donde corre)
2. Revisar logs del frontend (terminal donde corre)
3. Verificar que todas las variables de entorno están configuradas
4. Verificar que los puertos están libres
5. Verificar que Docker está corriendo

---

**Última actualización:** $(Get-Date -Format "dd/MM/yyyy")

