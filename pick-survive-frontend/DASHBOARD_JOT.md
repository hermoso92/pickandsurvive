# 📝 Dashboard JOT (Referencia UI/UX) — Pick & Survive

Este documento describe **cómo debe verse y qué debe mostrar** el **Dashboard** tomando como referencia la imagen objetivo (layout 3 columnas + menú superior estilo “juego”).

> Objetivo: que el equipo tenga una guía clara para implementar el Dashboard final sin perder coherencia visual ni funcional.

---

## ✅ Menú principal (barra superior)

### **Estructura**
- **Izquierda**: Logo + texto **Pick & Survive**
- **Centro (navegación)**:
  - **Dashboard**
  - **Mi Liga**
  - **Ediciones**
  - **Estadísticas**
  - **Invitar Amigos**
- **Derecha (estado + cuenta)**:
  - **Saldo** (PTS o € según el modelo final)
  - **Notificaciones** (contador)
  - **Cuenta de usuario** (avatar + alias + dropdown)

### **Comportamiento**
- La opción activa queda resaltada.
- En móvil: la navegación colapsa (hamburguesa o tabs).
- El “Saldo” y “Notificaciones” son visibles globalmente (no solo en Dashboard).

---

## ✅ Dashboard (layout 3 columnas)

### **Grid general**
- Desktop: **3 columnas**
  - **Columna izquierda** (liga + acciones + deadline + invitar)
  - **Columna central** (edición activa + picks + confirmación + historial)
  - **Columna derecha** (ranking + estadísticas rápidas)
- Mobile: apilado (columna central primero, luego izquierda, luego derecha) o diseño equivalente.

---

## 🧱 Columna izquierda (contexto de liga + acciones rápidas)

### **Tarjeta “Mi Liga”**
- **Título**: “Mi Liga: {nombreLigaSeleccionada}”
- **Selector**: dropdown para cambiar de liga (si el usuario tiene varias)
- **Acciones**
  - **Ver Liga** (detalle / tablero de la liga)
  - **Mi Perfil** (perfil del usuario dentro de la liga)
  - **Gestionar Liga** (solo si rol: OWNER/ADMIN)

### **Tarjeta “Próximo Deadline”**
- **Countdown**: “{HH}H {MM}M {SS}S hasta el cierre”
- **Texto**: “¡Haz tu pick antes del primer partido!”
- **Reglas**
  - Si ya pasó el deadline: estado “Cerrado” (sin CTA de pick).
  - Si falta poco: resaltar visualmente (warning).

### **CTA: Invitar Amigos**
- Botón grande: “Invitar Amigos”
- Lleva a flujo de invitación (email / link de invitación) asociado a la liga seleccionada.

---

## 🧱 Columna central (edición activa + picks)

### **Header “Edición Activa”**
- Texto: “Edición Activa: Jornada {n}”
- Subtítulo: “Elige tu Pick para hoy”
- Decoración/hero (banner tipo estadio)

### **Bloque Picks de la jornada**
Cada “partido” se representa como una card:
- **Partido**: “Equipo A vs Equipo B”
- **Hora/fecha** (si existe)
- **CTA**:
  - Si no hay pick: botón “Haz tu Pick”
  - Si ya hay pick: mostrar estado “Tu elegiste: {equipo}”
- **Estados**
  - Ganaste/perdiste el pick (cuando haya resultado)
  - Eliminado (si el modo lo contempla)

### **Confirmación**
Debajo de la selección:
- Texto de regla: “Un error y estás fuera”
- “Premio: {pozoActual} PTS”
- Botón principal: **Confirmar Pick**

### **Historial de ediciones**
Listado compacto:
- “Jornada X — Ganador: {usuario}” (si finalizada)
- “Jornada X — Ganadores: {u1} & {u2}” (si hay empates)
- “Jornada X — Eliminado” (si el usuario cayó en esa jornada)

---

## 🧱 Columna derecha (ranking + estadísticas rápidas)

### **Ranking de la Liga**
Lista ordenada por puntos:
- Posición (1..N)
- Avatar + alias
- Puntos (pts)
- Resaltar al usuario actual

### **Estadísticas rápidas**
Tarjeta con métricas clave:
- Jugadores activos
- Eliminados
- Pozo actual (PTS/€)

---

## 🔌 Datos necesarios (modelo mental)

> Nota: esto es “qué necesitamos”, no obliga aún a endpoints específicos.

### **Contexto**
- **Usuario**: alias/email, avatar, saldo, notificaciones
- **Liga seleccionada**: id, name, role del usuario

### **Dashboard**
- **Edición activa**: jornada, status (OPEN/IN_PROGRESS/CLOSED/FINISHED), deadline
- **Partidos**: listado de matches de la jornada (equipos, hora, ids)
- **Mi pick**: pick actual (si existe) + estado (pendiente/ganado/perdido)
- **Ranking**: tabla de puntos por usuario (dentro de liga/edición)
- **Stats rápidas**: activos, eliminados, pozo
- **Historial**: ediciones anteriores + ganadores/estado

---

## 🧩 Componentización sugerida (para implementar sin romper el diseño)

> Esto es guía para el refactor: componentes pequeños (<300 líneas).

- `DashboardLayout3Col`
  - `LeagueContextCard` (selector + acciones)
  - `DeadlineCard` (countdown + estado)
  - `InviteFriendsButton`
  - `ActiveEditionHeader`
  - `PickMatchesGrid`
  - `ConfirmPickPanel`
  - `EditionsHistoryList`
  - `LeagueRankingCard`
  - `QuickStatsCard`

---

## ✅ Estado actual vs objetivo (checklist)

### **Lo que YA existe (detectado en código actual)**
- ✅ **Ruta protegida**: `src/app/(protected)/dashboard/page.tsx`
- ✅ **Layout principal**: `src/components/MainLayout.tsx` 
  - ✅ **Header superior** con navegación principal (Dashboard, Mi Liga, Ediciones, Estadísticas, Invitar Amigos)
  - ✅ **Saldo visible** en header (usando `useBalance()`)
  - ✅ **Notificaciones** con contador (placeholder - UI lista)
  - ✅ **Cuenta de usuario** con dropdown (avatar, alias, menú)
  - ✅ **Sidebar móvil** para navegación administrativa
- **Datos básicos**:
  - Hook `useLeagues()` (ligas)
  - Hook `useBalance()` (saldo)
  - Logger `createLogger()` (sin `console.log`)

### **GAPS para llegar a la imagen (pendiente)**
- ✅ **Dashboard 3 columnas** - IMPLEMENTADO
- ✅ **Selector "Mi Liga"** con acciones (Ver Liga / Mi Perfil / Gestionar Liga) - IMPLEMENTADO
- ✅ **Deadline con countdown** - IMPLEMENTADO
- ✅ **Bloque de picks por partido + confirmación** - IMPLEMENTADO
- ✅ **Ranking liga + estadísticas rápidas** - IMPLEMENTADO
- ✅ **Historial de ediciones** en el propio dashboard - IMPLEMENTADO
- ✅ **Página `/statistics`** - IMPLEMENTADA

### **Mejoras implementadas recientemente**
- ✅ **Cálculo de ranking mejorado**: Usa picks correctos reales (basado en resultados de partidos)
- ✅ **Integración con resultados**: Muestra goles, estado del partido y resultado del pick
- ✅ **Estados visuales de picks**: 
  - ✅ Verde con "¡Ganaste!" para picks correctos
  - ❌ Rojo con "Perdiste" para picks incorrectos
  - ⏳ Gris para picks pendientes de resultado
- ✅ **Ranking mejorado**: Muestra medallas (🏆🥈🥉), porcentaje de aciertos y resalta al usuario actual
- ✅ **Historial de ediciones mejorado**: Muestra ganadores, estado del usuario y edición actual resaltada
- ✅ **Visualización de partidos**: Muestra goles, equipo ganador resaltado y estado del partido

### **Mejoras futuras sugeridas**
- ⚠️ Sistema de notificaciones completo (backend + frontend)
- ⚠️ Optimización de carga de datos (caché, lazy loading)
- ⚠️ Animaciones y transiciones suaves
- ⚠️ Modo oscuro/claro

---

## 📌 Siguiente paso recomendado (1 archivo por turno)

Elegir un objetivo pequeño y visible:
- Opción A: **Ajustar navegación global** para reflejar “Dashboard / Mi Liga / Ediciones / Estadísticas / Invitar Amigos” (sin romper lo existente).
- Opción B: **Re-maquetar `DashboardPage`** a layout 3 columnas con secciones “placeholder” (sin aún conectar todos los datos).


