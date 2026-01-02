# Pick and Survive

Aplicación web para gestión de predicciones deportivas (picks) con sistema de ligas, puntos, logros y tienda virtual.

## 🏗️ Estructura del Proyecto

```
pickandsurvive/
├── pick-survive-backend/    # API REST con NestJS
├── pick-survive-frontend/   # Frontend con Next.js
└── iniciar.ps1              # Script de inicio del sistema
```

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js (v18 o superior)
- PostgreSQL
- PowerShell (Windows)

### Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd pickandsurvive
```

2. Configurar variables de entorno:
   - Backend: `pick-survive-backend/.env`
   - Frontend: `pick-survive-frontend/.env.local`

3. Instalar dependencias:
```powershell
cd pick-survive-backend
npm install

cd ../pick-survive-frontend
npm install
```

4. Configurar base de datos:
```powershell
cd pick-survive-backend
npx prisma migrate dev
npx prisma generate
```

5. Iniciar el sistema:
```powershell
# Desde la raíz del proyecto
.\iniciar.ps1
```

El script `iniciar.ps1` iniciará automáticamente:
- Backend en puerto **9998**
- Frontend en puerto **5174**

## 📋 Características

- ✅ Sistema de autenticación (JWT + Google OAuth)
- ✅ Gestión de ligas y ediciones
- ✅ Sistema de picks (predicciones)
- ✅ Rankings y estadísticas
- ✅ Sistema de puntos y monedas
- ✅ Tienda virtual
- ✅ Logros (achievements)
- ✅ Panel de administración

## 🛠️ Tecnologías

### Backend
- **NestJS** - Framework Node.js
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **Passport** - Estrategias de autenticación

### Frontend
- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Zustand** - Gestión de estado

## 📝 Scripts Disponibles

### Backend
```bash
npm run start:dev    # Desarrollo
npm run build        # Compilar
npm run start:prod   # Producción
npm run test         # Tests
```

### Frontend
```bash
npm run dev          # Desarrollo
npm run build        # Compilar
npm run start        # Producción
npm run lint         # Linter
```

## 🔧 Configuración

### Variables de Entorno Backend

Ver `pick-survive-backend/.env.example` para referencia.

### Variables de Entorno Frontend

Ver `pick-survive-frontend/.env.example` para referencia.

## 📚 Documentación

- [Guía de Implementación](GUIA_RAPIDA_IMPLEMENTACION.md)
- [Análisis de Base de Datos](ANALISIS_BBDD_PICKSURVIVE.md)
- [Setup Completo](SETUP_COMPLETO.md)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y propietario.

## 👥 Autores

- DobackSoft Team

---

**Nota**: Asegúrate de configurar correctamente las variables de entorno antes de iniciar el sistema.

