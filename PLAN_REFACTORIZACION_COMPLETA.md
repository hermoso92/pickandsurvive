# 🔧 PLAN DE REFACTORIZACIÓN COMPLETA
## Pick & Survive - Versión Funcional

**Fecha:** 03/12/2025  
**Objetivo:** Crear una versión totalmente funcional y estable

---

## 📊 ANÁLISIS DE PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICOS (Bloquean funcionalidad básica)

1. **Errores de UUID en consultas SQL**
   - ✅ Parcialmente corregido (getUserBalance, getEditionPot, getModeRollover)
   - ⚠️ Pendiente: getMultipleUserBalances
   - **Impacto:** Error 500 en `/me/balance`

2. **Schema de Prisma con campos duplicados**
   - Modelo `Edition` tiene campos duplicados (camelCase y snake_case)
   - `league_id` y `leagueId` coexisten
   - **Impacto:** Confusión y posibles errores de datos

3. **Falta validación de saldo al unirse a ediciones**
   - Usuarios pueden unirse sin saldo suficiente
   - **Impacto:** Integridad financiera comprometida

4. **Errores de conexión frontend-backend**
   - URLs hardcodeadas a `localhost:3001` en varios archivos
   - ✅ Parcialmente corregido
   - **Impacto:** Funcionalidades no accesibles

### 🟡 ALTOS (Afectan experiencia de usuario)

5. **Manejo de errores inconsistente**
   - Algunos errores se lanzan como `Error` genérico
   - Falta de mensajes de error claros al usuario
   - **Impacto:** UX confusa cuando algo falla

6. **Falta validación de deadlines**
   - No se valida si el deadline pasó antes de hacer picks
   - **Impacto:** Usuarios pueden hacer picks después del deadline

7. **Eliminaciones prematuras de participantes**
   - Sistema puede eliminar antes de que termine el partido
   - **Impacto:** Jugadores eliminados incorrectamente

8. **Falta de transacciones atómicas**
   - Algunas operaciones críticas no están en transacciones
   - **Impacto:** Posible inconsistencia de datos

### 🟢 MEDIOS (Mejoras de calidad)

9. **Falta de tests**
   - 0% de cobertura de tests
   - **Impacto:** Difícil detectar regresiones

10. **Logging inconsistente**
    - Algunos servicios usan Logger, otros console.log
    - **Impacto:** Difícil debugging

11. **Documentación de API incompleta**
    - Falta documentación de endpoints
    - **Impacto:** Difícil integración

---

## 🎯 PLAN DE ACCIÓN

### FASE 1: CORRECCIONES CRÍTICAS (Prioridad 1)

#### 1.1 Corregir Schema de Prisma
- [ ] Eliminar campos duplicados en modelo Edition
- [ ] Crear migración para limpiar datos
- [ ] Actualizar todos los servicios que usan Edition

#### 1.2 Completar correcciones de UUID
- [ ] Corregir getMultipleUserBalances
- [ ] Revisar todas las consultas $queryRaw
- [ ] Agregar casting UUID donde sea necesario

#### 1.3 Implementar validación de saldo
- [ ] Agregar validación en joinEdition
- [ ] Mostrar error claro al usuario
- [ ] Actualizar frontend para mostrar saldo insuficiente

#### 1.4 Corregir todas las URLs del frontend
- [ ] Reemplazar todos los `localhost:3001`
- [ ] Usar API_BASE_URL consistentemente
- [ ] Verificar todos los fetch calls

### FASE 2: MEJORAS DE ESTABILIDAD (Prioridad 2)

#### 2.1 Mejorar manejo de errores
- [ ] Crear excepciones personalizadas
- [ ] Implementar filtro global de excepciones
- [ ] Agregar mensajes de error claros

#### 2.2 Implementar validación de deadlines
- [ ] Validar deadline en createPick
- [ ] Mostrar mensaje claro si pasó el deadline
- [ ] Agregar countdown en frontend

#### 2.3 Corregir eliminaciones prematuras
- [ ] Mejorar lógica de validación temporal
- [ ] Agregar buffer de seguridad
- [ ] Implementar logs detallados

#### 2.4 Agregar transacciones atómicas
- [ ] Envolver joinEdition en transacción
- [ ] Envolver updateMatchResult en transacción
- [ ] Envolver createPick en transacción

### FASE 3: MEJORAS DE CALIDAD (Prioridad 3)

#### 3.1 Estandarizar logging
- [ ] Reemplazar todos los console.log por Logger
- [ ] Configurar niveles de log apropiados
- [ ] Agregar contexto a los logs

#### 3.2 Mejorar validaciones
- [ ] Agregar DTOs con class-validator
- [ ] Validar todos los inputs
- [ ] Agregar sanitización

#### 3.3 Optimizar consultas
- [ ] Revisar N+1 queries
- [ ] Agregar índices faltantes
- [ ] Optimizar queries complejas

---

## 🚀 ORDEN DE IMPLEMENTACIÓN

1. **Corregir Schema Prisma** (30 min)
2. **Completar correcciones UUID** (15 min)
3. **Implementar validación de saldo** (30 min)
4. **Corregir URLs frontend** (20 min)
5. **Mejorar manejo de errores** (45 min)
6. **Implementar validación deadlines** (30 min)
7. **Corregir eliminaciones prematuras** (45 min)
8. **Agregar transacciones** (30 min)
9. **Estandarizar logging** (30 min)
10. **Mejorar validaciones** (45 min)

**Tiempo estimado total:** ~5 horas

---

## ✅ CRITERIOS DE ÉXITO

- [ ] Todos los endpoints responden correctamente
- [ ] No hay errores 500 en operaciones básicas
- [ ] Validaciones funcionan correctamente
- [ ] Frontend se conecta correctamente al backend
- [ ] No hay inconsistencias de datos
- [ ] Logs son claros y útiles
- [ ] Errores se muestran claramente al usuario

---

## 📝 NOTAS

- Mantener compatibilidad con datos existentes
- Documentar todos los cambios
- Probar cada cambio antes de continuar
- Crear backups antes de migraciones

