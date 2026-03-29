# ORQO Dashboard

Panel de administración para ORQO — asistente de IA para WordPress y WhatsApp.

## Stack

- **Framework**: Next.js 16.2.1 (App Router, Turbopack)
- **UI**: React 19, TypeScript
- **Base de datos**: MongoDB Atlas (base `orqo`)
- **Auth**: Magic links via Resend + JWT (jose), cookie `orqo_session` (7 días)
- **Deploy**: Vercel → `dashboard.orqo.io`

## Variables de entorno

```env
MONGODB_URI=mongodb+srv://...
RESEND_API_KEY=re_...
JWT_SECRET=...          # string largo aleatorio
APP_URL=https://dashboard.orqo.io
EMAIL_FROM=hola@orqo.io
```

> En desarrollo, el magic link se imprime en la consola en lugar de enviarse por email.

## Desarrollo local

```bash
cd orqo-dashboard
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Estructura

```
orqo-dashboard/
├── app/
│   ├── api/auth/        ← login (magic link) + verify + logout
│   ├── dashboard/       ← páginas del panel
│   │   ├── page.tsx     ← Resumen
│   │   ├── widget/
│   │   ├── agents/
│   │   ├── conversations/
│   │   ├── integrations/
│   │   ├── account/
│   │   └── users/
│   ├── login/           ← página de login
│   └── globals.css      ← design tokens, dark + light mode
├── components/
│   ├── Sidebar.tsx      ← nav lateral con toggle dark/light
│   └── AuthGuard.tsx    ← redirección si no hay sesión
└── lib/
    └── auth.ts          ← helpers JWT y sesión
```

## Rutas de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Envía magic link al email |
| GET | `/api/auth/verify` | Verifica token y crea sesión |
| POST | `/api/auth/logout` | Borra cookie de sesión |

## Deploy

Auto-deploy en Vercel al hacer push a `main` en el submodulo `orqo-dashboard/`.
El dashboard tiene su propio repositorio git dentro del repo principal.
