# ORQO Dashboard

Panel de administración para ORQO — asistente de IA para WordPress y WhatsApp.

## Stack

- **Framework**: Next.js 16.2.1 (App Router, Turbopack)
- **UI**: React 19, TypeScript, Recharts
- **Base de datos**: MongoDB Atlas (base `orqo`)
- **Auth**: Google OAuth 2.0 (SSO) + Magic links via Resend
- **Sesión**: JWT (jose), cookie `orqo_session` (7 días), permisos embebidos
- **Autorización**: RBAC — 5 roles, 15 módulos de sistema, Edge Middleware
- **Deploy**: Vercel → `dashboard.orqo.io`

## Variables de entorno

```env
MONGODB_URI=mongodb+srv://...
RESEND_API_KEY=re_...
SESSION_SECRET=...          # string largo aleatorio
APP_URL=https://dashboard.orqo.io
EMAIL_FROM=ORQO <noreply@orqo.io>
GOOGLE_CLIENT_ID=...        # Google Cloud Console
GOOGLE_CLIENT_SECRET=...
```

> En desarrollo, el magic link se imprime en la consola (no necesita email).

## Roles y permisos

| Rol | Permisos |
|---|---|
| `owner` | Todos |
| `admin` | Todo excepto billing y roles |
| `analyst` | Lectura conversaciones + informes |
| `agent_manager` | Agentes + conversaciones |
| `viewer` | Solo lectura |

El primer usuario que hace login se crea automáticamente como `owner`.

## Desarrollo local

```bash
cd orqo-dashboard
npm install
npm run dev
# → http://localhost:3000
```

Para agregar Google OAuth en local, crear credenciales en Google Cloud Console con:
- Origen: `http://localhost:3000`
- Redirect URI: `http://localhost:3000/api/auth/google/callback`

## Seed de datos

```bash
# RBAC — roles y módulos del sistema (idempotente)
curl -X POST http://localhost:3000/api/seed/rbac

# Analytics — 30 días de datos de prueba (idempotente)
curl -X POST http://localhost:3000/api/seed
```

## Estructura

```
orqo-dashboard/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── google/         ← OAuth redirect + callback
│   │   │   ├── me/             ← sesión actual (no DB)
│   │   │   ├── login/          ← magic link
│   │   │   ├── verify/         ← valida token
│   │   │   └── logout/
│   │   ├── users/              ← CRUD usuarios (requiere settings.users)
│   │   ├── roles/              ← listar/actualizar roles (requiere settings.roles)
│   │   ├── analytics/          ← métricas ?days=7|30|90
│   │   ├── seed/               ← analytics seed
│   │   └── seed/rbac/          ← RBAC seed
│   ├── dashboard/
│   │   ├── page.tsx            ← Vista general (KPIs + convs recientes)
│   │   ├── conversations/      ← tabla con filtros por canal
│   │   ├── agents/             ← gestión de agentes
│   │   ├── reports/            ← analytics con recharts
│   │   └── settings/           ← widget / integraciones / accesos / cuenta
│   ├── login/                  ← Google SSO + magic link
│   └── globals.css             ← design tokens, dark mode
├── components/
│   ├── Sidebar.tsx
│   ├── DashboardNav.tsx        ← mobile off-canvas wrapper
│   └── auth/
│       └── PermissionGate.tsx  ← renderizado condicional por permiso
├── hooks/
│   └── usePermissions.ts       ← useSession, useHasPermission, useRole
├── lib/
│   ├── auth.ts                 ← JWT helpers, SessionPayload, buildSessionPayload
│   ├── rbac.ts                 ← SYSTEM_MODULES, DEFAULT_ROLES, hasPermission
│   └── mongodb.ts              ← conexión MongoDB
└── proxy.ts                    ← Edge Middleware RBAC (JWT + route permissions)
```

## Rutas de la API

| Método | Ruta | Permiso requerido |
|---|---|---|
| GET | `/api/auth/me` | — (sesión válida) |
| GET | `/api/auth/google` | — público |
| GET | `/api/auth/google/callback` | — público |
| POST | `/api/auth/login` | — público |
| GET | `/api/auth/verify` | — público |
| POST | `/api/auth/logout` | — público |
| GET/POST/DELETE | `/api/users` | `settings.users` |
| GET/PATCH | `/api/roles` | `settings.roles` |
| GET | `/api/analytics` | `reports.view` |
| POST | `/api/seed` | `admin.seed` |
| POST | `/api/seed/rbac` | `admin.seed` |

## Deploy

Auto-deploy en Vercel al hacer push a `main`.
