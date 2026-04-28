## KinCircle

KinCircle is a family reunion planning app built with Next.js, Better Auth, Drizzle, and Railway.

## Environment Model

The source of truth for database structure is the code in `src/db/schema.ts` plus the checked-in Drizzle migrations in `src/db/migrations/`.

Environment flow:

- Local development targets Railway `development`
- Reviewed migrations are applied to Railway `development` first
- Production changes are promoted from the same migration files, not recreated manually
- Production is never the default target for local commands

Operational rules:

- Use `railway environment development` for normal work
- Use explicit `--environment production` when touching production on purpose
- Do not edit schema directly in Railway; change code, review the generated migration, then apply it

## Getting Started

Start the app locally:

```bash
npm run dev
```

Useful commands:

```bash
npm run lint
npm run build
npm run auth:info
npm run db:generate
npm run db:migrate
```

When applying a production migration, make the target explicit and switch back afterward:

```bash
railway environment production
npm run db:migrate
railway environment development
```

## Railway

- Project: `kincircle`
- Services: `web`, `Postgres`
- Local `.env.local` should point at the `development` database, not `production`
- Each Railway environment should have its `web` service `DATABASE_URL` wired to that environment's `Postgres` service
- Railway deploy config lives in `railway.json`
- Build command: `npm run build`
- Pre-deploy migration command: `npm run db:migrate`
- Start command: `npm run start`
- Health check: `/api/health`

Required service variables:

```bash
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=
EMAIL_FROM=
```

Optional service variables:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MAPBOX_ACCESS_TOKEN=
```
