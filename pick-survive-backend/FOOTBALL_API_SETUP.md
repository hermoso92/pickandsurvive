# Configuración de APIs de Fútbol

## Football Data API (Recomendado)

### Registro y Token
1. Ve a [football-data.org](https://www.football-data.org/)
2. Regístrate para obtener un token gratuito
3. Agrega el token a tu archivo `.env`:
   ```
   FOOTBALL_DATA_TOKEN=tu_token_aqui
   ```

### Límites del Plan Gratuito
- 10 requests por minuto
- 100 requests por día
- Datos de competiciones principales

### Códigos de Competiciones
- `PD` - Primera División (LaLiga)
- `CL` - Champions League
- `EL` - Europa League
- `FL1` - Ligue 1
- `BL1` - Bundesliga
- `PL` - Premier League

## API Football (Alternativa)

### Registro y Token
1. Ve a [API-Football](https://www.api-football.com/)
2. Regístrate para obtener un token
3. Agrega el token a tu archivo `.env`:
   ```
   API_FOOTBALL_TOKEN=tu_token_aqui
   ```

### Límites del Plan Gratuito
- 100 requests por día
- Datos más detallados (alineaciones, eventos, etc.)

## Configuración del Sistema

### Variables de Entorno Requeridas
```env
# Base de datos
DATABASE_URL="postgresql://postgres:password@localhost:5432/pick_and_survive?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Football Data API (principal)
FOOTBALL_DATA_TOKEN="your-football-data-api-token"

# API Football (opcional)
API_FOOTBALL_TOKEN="your-api-football-token"

# Servidor
PORT=3000
```

## Uso del Sistema

### 1. Sincronización Inicial
```bash
# Sincronizar equipos de LaLiga
POST /football-data/sync/teams
{
  "competition": "PD"
}

# Sincronizar jornada específica
POST /football-data/sync/matchday
{
  "competition": "PD",
  "season": 2025,
  "matchday": 1
}
```

### 2. Sincronización Automática
El sistema incluye jobs para:
- **sync-fixtures**: Cada 6 horas para actualizar horarios
- **sync-live**: Cada 5 minutos durante partidos en vivo

### 3. Endpoints Disponibles
- `GET /football-data/competitions` - Lista competiciones
- `GET /football-data/matches/matchday` - Partidos por jornada
- `GET /football-data/matches/live` - Partidos en vivo
- `POST /football-data/sync/matchday` - Sincronizar jornada
- `POST /football-data/sync/live` - Sincronizar partidos en vivo

## Migración de Base de Datos

Después de actualizar el schema, ejecuta:
```bash
npx prisma migrate dev --name add-external-api-fields
npx prisma generate
```

## Próximos Pasos

1. **Obtener token** de football-data.org
2. **Configurar variables** de entorno
3. **Ejecutar migración** de base de datos
4. **Sincronizar equipos** y partidos iniciales
5. **Configurar jobs** de sincronización automática
