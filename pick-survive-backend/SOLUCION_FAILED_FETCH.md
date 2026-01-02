# 🔧 Solución "Failed to fetch" - Pick & Survive

## ❌ **Problema Identificado**
El error "Failed to fetch" se debe a problemas de configuración entre frontend y backend.

## ✅ **Soluciones Aplicadas**

### **1. Configuración de CORS Actualizada**
- ✅ **Backend**: Ahora permite conexiones desde `http://localhost:3002`
- ✅ **Puerto**: Backend configurado para puerto 3001
- ✅ **Credentials**: Habilitado para autenticación

### **2. Configuración de API Corregida**
- ✅ **Frontend**: Apunta correctamente a `http://localhost:3001`
- ✅ **Puerto**: Frontend corriendo en puerto 3002

## 🚀 **Instrucciones para Reiniciar**

### **Paso 1: Detener Servidores Actuales**
```bash
# Presiona Ctrl+C en ambas terminales para detener los servidores
```

### **Paso 2: Iniciar Backend**
```bash
cd pick-survive-backend
npm run start:dev
```

### **Paso 3: Iniciar Frontend (Nueva Terminal)**
```bash
cd pick-survive-frontend
npm run dev
```

### **Paso 4: Verificar Puertos**
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:3002

## 🌐 **Enlaces Correctos**

### **🎮 Frontend (Aplicación Principal)**
**http://localhost:3002**

### **🔧 Backend (API)**
**http://localhost:3001**

## 🔍 **Verificación**

### **Comprobar que Funciona**
1. Ve a: **http://localhost:3002**
2. Intenta **registrar un usuario**
3. Si funciona, el problema está solucionado

### **Si Aún Hay Problemas**
1. Verifica que ambos servidores estén corriendo
2. Revisa la consola del navegador (F12) para errores
3. Asegúrate de usar el puerto correcto (3002)

## ✨ **Estado Esperado**

- ✅ **Backend**: Puerto 3001 - CORS configurado
- ✅ **Frontend**: Puerto 3002 - API configurada
- ✅ **Conexión**: Sin errores "Failed to fetch"
- ✅ **Registro**: Funcionando correctamente

¡Después del reinicio debería funcionar perfectamente! 🎉
