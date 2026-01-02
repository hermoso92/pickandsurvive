# Configuración de Correo Gmail para Pick & Survive

## Pasos para Configurar Gmail

### 1. Crear la Cuenta de Correo
- Crear la cuenta: `picksurvive@gmail.com`
- Configurar una contraseña segura

### 2. Configurar la Cuenta Gmail
**IMPORTANTE**: Gmail requiere configuración adicional para aplicaciones:

#### Opción A: Habilitar "Acceso de aplicaciones menos seguras" (No recomendado)
1. Ir a [myaccount.google.com](https://myaccount.google.com)
2. Ir a "Seguridad" → "Acceso de aplicaciones menos seguras"
3. Activar esta opción
4. Usar la contraseña normal: `MasterPick&survive`

#### Opción B: Usar Contraseña de Aplicación (Recomendado)
1. Ir a [myaccount.google.com](https://myaccount.google.com)
2. Ir a "Seguridad" → "Verificación en 2 pasos"
3. Activar la verificación en 2 pasos
4. Ir a "Contraseñas de aplicaciones"
5. Generar una contraseña para "Pick & Survive Backend"
6. Usar esa contraseña de 16 caracteres en lugar de `MasterPick&survive`

### 3. Configurar Variables de Entorno
Agregar al archivo `.env`:

```env
# Configuración de correo Gmail
EMAIL_USER="picksurvive@gmail.com"
EMAIL_PASSWORD="MasterPick&survive"
```

### 4. Verificar Configuración
El servicio de correo ahora usará:
- **Servicio**: Gmail SMTP
- **Usuario**: picksurvive@gmail.com
- **Contraseña**: MasterPick&survive
- **Remitente**: "Pick & Survive" <picksurvive@gmail.com>

## Tipos de Correos que se Envían

1. **Invitaciones a Ligas**: Cuando alguien invita a un usuario a una liga
2. **Correos de Bienvenida**: Cuando un usuario se registra

## Notas Importantes

- ✅ Los correos se envían desde "Pick & Survive" <picksurvive@gmail.com>
- ✅ Usa la contraseña normal de la cuenta: MasterPick&survive
- ⚠️ Si cambias la contraseña de la cuenta, necesitarás actualizar la variable EMAIL_PASSWORD
- ⚠️ Si Gmail requiere verificación en 2 pasos, puede ser necesario habilitar "Acceso de aplicaciones menos seguras" o usar contraseña de aplicación
