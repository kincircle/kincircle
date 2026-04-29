# KinCircle Deployment

KinCircle deploys as one full-stack Next.js service plus one Postgres database.

## Repository Shape

```txt
kincircle/
├── src/app/        # Next.js pages and layouts
├── src/app/api/    # API routes and Better Auth handler
├── src/lib/        # server actions, auth, email, DB helpers
├── src/db/         # Drizzle schema and migrations
├── public/         # static image assets
├── railway.json    # Railway build/deploy settings
└── package.json    # app scripts and dependencies
```

There is no separate `web/`, `api/`, or `backend/` package. The backend is the Next.js server runtime in the `web` Railway service.

## Railway Services

```txt
Railway project: kincircle
├── web       Next.js frontend + API routes + Better Auth
└── Postgres  application database
```

The `web` service should deploy from the repo root on branch `main`.

## Railway Config

`railway.json` defines the deployment behavior:

```txt
Build command:       npm run build
Pre-deploy command:  npm run db:migrate
Start command:       HOSTNAME=0.0.0.0 npm run start
Health check:        /api/health
```

The app uses Next standalone output, so `npm run start` runs `.next/standalone/server.js`.

## Required Variables

Set these on the Railway `web` service:

```txt
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
EMAIL_FROM
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Optional:

```txt
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
MAPBOX_ACCESS_TOKEN
```

`DATABASE_URL` should be a Railway reference variable from the Postgres service so it stays in sync if database credentials rotate.

## GitHub Pages

Do not deploy the app itself to GitHub Pages. GitHub Pages is only appropriate for static marketing pages. KinCircle needs server-side Next.js routes, auth callbacks, cookies, email delivery, and database access, so Railway should host the app.
