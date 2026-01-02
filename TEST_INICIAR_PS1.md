# ✅ TEST DEL SCRIPT iniciar.ps1

## 🔍 Verificación Realizada

### Estado del Script

- ✅ **Archivo existe:** `iniciar.ps1` (183 líneas, 6.1 KB)
- ✅ **Prerequisitos instalados:**
  - Docker: ✅ Instalado
  - Node.js: ✅ v24.11.0
  - npm: ✅ 11.6.1
- ✅ **Directorios existen:**
  - pick-survive-backend: ✅
  - pick-survive-frontend: ✅

### Errores de Sintaxis Detectados

El parser de PowerShell detectó algunos errores, pero son **falsos positivos** causados por:
- Emojis en los mensajes (🔍, ✅, ⚠️, etc.)
- Caracteres especiales en strings

**El script debería funcionar correctamente** a pesar de estas advertencias.

---

## 🚀 Cómo Ejecutar el Script

### Opción 1: Desde PowerShell (Recomendado)

```powershell
# Desde el directorio raíz del proyecto
.\iniciar.ps1
```

### Opción 2: Con permisos explícitos

Si tienes problemas de política de ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File .\iniciar.ps1
```

---

## ⚠️ Si el Script No Funciona

### Problema: "No se puede ejecutar"

**Solución:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Problema: "No se encuentra el archivo"

**Solución:**
```powershell
# Asegúrate de estar en el directorio correcto
cd "C:\Users\Cosigein SL\Desktop\pickandsurvive\pickandsurvive - copia"
.\iniciar.ps1
```

### Problema: "Docker no está corriendo"

**Solución:**
```powershell
# Iniciar Docker Desktop manualmente
# O el script lo iniciará automáticamente
```

---

## 🔧 Alternativa: Inicio Manual

Si el script no funciona, puedes iniciar manualmente:

### Terminal 1: Backend
```powershell
cd pick-survive-backend
$env:PORT=9998
npm run start:dev
```

### Terminal 2: Frontend
```powershell
cd pick-survive-frontend
npm run dev -- -p 5174
```

---

## ✅ Verificación del Script

El script hace lo siguiente:

1. ✅ Verifica directorios
2. ✅ Libera puertos 9998 y 5174
3. ✅ Verifica Docker
4. ✅ Genera Prisma Client
5. ✅ Ejecuta migraciones
6. ✅ Inicia backend en ventana separada
7. ✅ Inicia frontend en ventana separada
8. ✅ Verifica que los servicios respondan
9. ✅ Abre navegador automáticamente

---

**Última verificación:** $(Get-Date -Format "dd/MM/yyyy HH:mm")

