# Despliegue en Ubuntu (VPS)

## Qué puedo hacer yo (desde acá) y qué no

**No puedo:** entrar por SSH a tu VPS, crear registros DNS, ni ejecutar `certbot` con permisos root en tu máquina. Eso siempre lo hace un humano (vos) o tu proveedor.

**Sí quedó automatizado en el repo:** secretos (Postgres + JWT), URLs para el front/API, `DATABASE_URL` y el arranque de Docker Compose, sin commitear contraseñas.

## Camino mínimo en el servidor

Desde la raíz del repo (con Docker instalado):

```bash
pnpm docker:stack
```

La **primera vez** no tenés `.env.stack`: el script lo genera solo (URLs locales + contraseñas aleatorias) y levanta Postgres, API y Web. La base **`pickandsurvive`** la crea Postgres en el primer arranque del volumen; las tablas, **`prisma migrate deploy`** al iniciar la API.

### Producción con dominios (sin prompts)

```bash
NEXT_PUBLIC_API_URL=https://api.tudominio.com \
APP_URL=https://app.tudominio.com \
bash deploy/scripts/configure-vps.sh --yes
pnpm docker:stack
```

Eso **sobrescribe** `.env.stack` con nuevas claves salvo que ya hayas exportado `POSTGRES_PASSWORD` / `JWT_SECRET` y quieras conservarlas.

### Solo tocar la URL pública de la API (sin regenerar todo)

Editá un `.env` en la raíz (gitignored) con una línea `NEXT_PUBLIC_API_URL=...`. `stack-up.sh` carga primero `.env.stack` y después `.env`, así que `.env` gana para esa variable. Volvé a buildear la web si cambió:

```bash
bash deploy/scripts/load-stack-env.sh
docker compose -f docker-compose.stack.yml build web --no-cache && docker compose -f docker-compose.stack.yml up -d web
```

(`load-stack-env.sh` está pensado para `source` desde bash: `source deploy/scripts/load-stack-env.sh`.)

## Scripts útiles

| Script | Qué hace |
|--------|----------|
| `deploy/scripts/configure-vps.sh` | Crea/actualiza `.env.stack` (interactivo o `--yes`). |
| `deploy/scripts/stack-up.sh` | Carga env + `docker compose -f docker-compose.stack.yml up -d --build`. |
| `deploy/scripts/postgres-only-up.sh` | Solo Postgres (`docker-compose.prod.yml`) con la misma clave que `.env.stack`. |
| `deploy/scripts/backup-postgres.sh` | Volcado del contenedor `pickandsurvive_postgres`. |

Comandos pnpm: `configure:vps`, `docker:stack`, `docker:postgres`, `docker:stack:down`.

## Archivos en git vs secretos

- **En git:** `deploy/env/postgres.env` (usuario y nombre de base, **sin** contraseña), `deploy/env/api.stack.env` (solo `NODE_ENV` y `PORT`).
- **No en git:** `.env.stack` (contraseña Postgres, JWT, URLs, `DATABASE_URL`). Generado por `configure-vps.sh` o automáticamente la primera vez que corrés `pnpm docker:stack`.

Si **cambiás** `POSTGRES_PASSWORD` con un volumen ya creado, Postgres **no** actualiza el usuario solo: o bien recreás el volumen (se pierden datos) o cambiás la clave dentro de Postgres a mano.

## Nginx y TLS (en el host)

Proxy a `127.0.0.1:3000` (web) y `127.0.0.1:3001` (API). Referencias: `deploy/nginx/pickandsurvive.conf` (HTTP) y `deploy/nginx/pickandsurvive-https.conf` (HTTPS). Certificados: `certbot` en el VPS.

## API / Web sin Docker (Node en el host)

```bash
cp deploy/env/api.env.example apps/api/.env
cp deploy/env/web.env.example apps/web/.env.production
```

Alineá `DATABASE_URL` en `apps/api/.env` con la clave de `.env.stack` si Postgres corre con `docker-compose.prod.yml`.

```bash
pnpm install && pnpm build
pnpm --filter @pickandsurvive/api exec prisma migrate deploy
```

Systemd/PM2: `deploy/systemd/`, `deploy/ecosystem.config.cjs`.

## CORS

La API usa `CORS_ORIGIN` o, si no está, `APP_URL` (definidos en `.env.stack` / `apps/api/.env`). Deben coincidir con la URL real del front en el navegador.

## Backup

```bash
BACKUP_DIR=~/backups/pickandsurvive ./deploy/scripts/backup-postgres.sh
```

Cron de ejemplo: `deploy/cron/backup-postgres.example`.
