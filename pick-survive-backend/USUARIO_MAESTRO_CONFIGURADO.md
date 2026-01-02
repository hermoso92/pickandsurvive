# Usuario Maestro Configurado

## ✅ Cambios Realizados

### 1. Usuario Convertido a Maestro
- **Usuario ID**: `cmipy37eq0000dqq47n7r51uj`
- **Email anterior**: `antoniohermoso92@gmail.com`
- **Email actual**: `master@pickandsurvive.com`
- **Alias**: `Antonio`

### 2. Nuevo Endpoint para Asignar Créditos
Se ha agregado un nuevo endpoint en el controlador de administración:

**POST** `/admin/users/:userId/credits`

**Headers requeridos:**
- `Authorization: Bearer <JWT_TOKEN>` (del usuario maestro)

**Body:**
```json
{
  "amountCents": 10000,  // Cantidad en centavos (10000 = 100.00 unidades)
  "reason": "Créditos de prueba"  // Opcional
}
```

**Respuesta:**
```json
{
  "success": true,
  "newBalance": 15000  // Nuevo balance del usuario en centavos
}
```

**Ejemplo de uso:**
```bash
curl -X POST http://localhost:9998/admin/users/cmipy37eq0000dqq47n7r51uj/credits \
  -H "Authorization: Bearer <TU_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "amountCents": 10000,
    "reason": "Créditos de prueba para testing"
  }'
```

### 3. Permisos de Usuario Maestro
El usuario con email `master@pickandsurvive.com` ahora tiene acceso a:

- ✅ **GET** `/admin/users` - Listar todos los usuarios
- ✅ **DELETE** `/admin/users/:userId` - Eliminar usuarios
- ✅ **POST** `/admin/users/:userId/credits` - Asignar créditos a cualquier usuario
- ✅ Todos los endpoints de `/football-data` (sincronización de datos)
- ✅ Endpoints de administración de ediciones

## 🔐 Autenticación

Para usar estos endpoints, necesitas:
1. Iniciar sesión con el email `master@pickandsurvive.com` y tu contraseña
2. Obtener el JWT token del endpoint `/auth/login`
3. Incluir el token en el header `Authorization: Bearer <token>`

## 📝 Notas

- El balance se calcula sumando todas las entradas del ledger del usuario
- Los créditos asignados se registran como tipo `ADJUSTMENT` en el ledger
- Cada asignación incluye un timestamp y razón en los metadatos
- El sistema verifica que solo usuarios maestros puedan asignar créditos

## 🧪 Pruebas

Para probar la asignación de créditos:

1. Inicia sesión como maestro:
```bash
POST /auth/login
{
  "email": "master@pickandsurvive.com",
  "password": "tu_contraseña"
}
```

2. Asigna créditos a tu usuario:
```bash
POST /admin/users/cmipy37eq0000dqq47n7r51uj/credits
{
  "amountCents": 50000,  // 500.00 unidades
  "reason": "Créditos iniciales para pruebas"
}
```

3. Verifica tu balance:
```bash
GET /me/balance
```

