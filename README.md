# SwasthaParivar

SwasthaParivar is a full-stack family health management platform for organizing family members, health records, reminders, reports, home-remedy guidance, and AI-assisted health conversations in one place.

The app is split into a Vite React frontend and an Express/MongoDB backend. The frontend is designed for Vercel, while the backend is configured for Render-style deployment.

Live links:

- Frontend: https://swastha-parivar.vercel.app
- Backend health check: https://swasthaparivar-v1.onrender.com/health

> Medical disclaimer: SwasthaParivar is an organization and guidance tool. It does not replace licensed medical advice, diagnosis, treatment, emergency care, or consultation with a doctor.

## What It Does

- Family profiles for different members of a household
- Auth with access and refresh token flow
- Household invite and join flow
- Health records for vitals and member-specific tracking
- Medicine, vaccination, checkup, and custom reminders
- Push notification support through VAPID keys
- Medical report upload, management, and doctor-share PDF generation
- Home remedy library with safety checks and adverse event handling
- AI health chat backed by Google Gemini
- AI memory, insight storage, reminder extraction, and report review flows
- Pricing, privacy, terms, public remedy pages, and protected dashboard pages
- Optional Redis-backed rate limiting
- Optional Sentry monitoring
- Optional PostHog frontend analytics

## Tech Stack

Frontend:

- React 19
- Vite
- React Router
- Material UI
- SWR
- Axios
- Framer Motion
- Recharts
- FullCalendar
- PWA/service worker support

Backend:

- Node.js
- Express
- MongoDB with Mongoose
- JWT auth
- Zod validation
- Helmet, CORS, cookie-parser
- Multer uploads
- Web Push
- Node Cron jobs
- Pino logging
- Optional Redis
- Optional Sentry
- Google Gemini AI

## Repository Structure

```text
Swastha Parivar/
|-- README.md
|-- docs/
|-- SwasthaParivar-Frontend-main/
|   `-- SwasthaParivar-Frontend-main/
|       |-- src/
|       |-- public/
|       |-- package.json
|       |-- vite.config.js
|       `-- vercel.json
`-- SwasthaParivar-Backend-main/
    `-- SwasthaParivar-Backend-main/
        |-- controllers/
        |-- routes/
        |-- models/
        |-- services/
        |-- middleware/
        |-- validations/
        |-- utils/
        |-- jobs/
        |-- package.json
        |-- render.yaml
        `-- server.js
```

## Prerequisites

- Node.js 20 or newer recommended
- npm
- MongoDB database connection string
- Google Gemini API key for AI features
- VAPID public/private keys for push notifications
- Google OAuth credentials if using Google sign-in
- Redis URL if using Redis-backed rate limits
- Sentry DSNs if enabling monitoring

## Local Setup

Clone the repository:

```bash
git clone https://github.com/pds-37/SwasthaParivar.git
cd SwasthaParivar
```

Install backend dependencies:

```bash
cd SwasthaParivar-Backend-main/SwasthaParivar-Backend-main
npm install
```

Install frontend dependencies:

```bash
cd ../../SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main
npm install
```

## Environment Variables

Create a backend `.env` file from:

```text
SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/.env.example
```

Minimum backend variables:

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/swasthaparivar
JWT_SECRET=replace_with_a_long_secret
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173
COOKIE_SAME_SITE=strict
APP_VERSION=backend-local
```

Recommended backend variables:

```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
VAPID_PUBLIC_KEY=your_public_vapid_key
VAPID_PRIVATE_KEY=your_private_vapid_key
REDIS_URL=
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
PRIVACY_POLICY_VERSION=v1.0
```

Create a frontend `.env.local` file from:

```text
SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main/.env.example
```

Frontend variables:

```env
VITE_API_URL=http://localhost:5000/api
VITE_VAPID_PUBLIC_KEY=your_public_vapid_key
VITE_POSTHOG_KEY=
VITE_SENTRY_DSN=
VITE_APP_VERSION=frontend-local
```

`VITE_API_URL` can be either the backend origin or the full API base. For example, both `http://localhost:5000` and `http://localhost:5000/api` are accepted by the frontend API helper.

## Running Locally

Start the backend:

```bash
cd SwasthaParivar-Backend-main/SwasthaParivar-Backend-main
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

Start the frontend in a second terminal:

```bash
cd SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Scripts

Backend scripts:

```bash
npm run dev      # Start Express with nodemon
npm start        # Start Express with node
npm run check    # Syntax-check server.js
npm test         # Run node:test files in tests/
```

Frontend scripts:

```bash
npm run dev              # Start Vite dev server
npm run build            # Build production frontend
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run analyze:bundle   # Generate bundle visualization
```

## Main Frontend Routes

Public routes:

- `/`
- `/privacy`
- `/terms`
- `/pricing`
- `/remedy-library`
- `/remedy-library/:sectorId`
- `/remedy/:id`
- `/join/:code`
- `/auth`

Protected routes:

- `/dashboard`
- `/family`
- `/family/:id`
- `/health`
- `/health/:id`
- `/reports`
- `/remedies`
- `/ai-chat`
- `/reminders`
- `/settings`

## Main Backend API Areas

Health and root:

- `GET /health`
- `GET /`

API route groups:

- `/api/auth`
- `/api/ai`
- `/api/ai/memory`
- `/api/reminders`
- `/api/members`
- `/api/households`
- `/api/referral`
- `/api/account`
- `/api/config`
- `/api/health`
- `/api/remedies`
- `/api/reports`
- `/api/symptoms`
- `/api` notification routes

Most API groups are protected by auth and rate limiting. Auth routes are public where needed.

## Google OAuth Setup

1. Create a Google OAuth web client in Google Cloud Console.
2. Add the frontend URL to Authorized JavaScript origins.
3. Add the backend callback URL to Authorized redirect URIs.
4. For local development, use:

```text
http://localhost:5000/api/auth/google/callback
```

5. For production, use:

```text
https://your-backend-domain/api/auth/google/callback
```

6. Add privacy policy and terms URLs in the OAuth consent screen.
7. Add test users while the Google app is in testing mode.

If `GOOGLE_REDIRECT_URI` is not set, the backend derives `/api/auth/google/callback` from the current request host.

## Deployment

### Frontend on Vercel

Set these environment variables in Vercel:

```env
VITE_API_URL=https://your-backend-domain/api
VITE_VAPID_PUBLIC_KEY=your_public_vapid_key
VITE_POSTHOG_KEY=your_posthog_public_key
VITE_SENTRY_DSN=your_frontend_sentry_dsn
VITE_APP_VERSION=frontend-production
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

### Backend on Render

Set these environment variables in Render:

```env
NODE_ENV=production
PORT=10000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_long_production_secret
GEMINI_API_KEY=your_gemini_api_key
CORS_ORIGINS=https://your-frontend-domain
CLIENT_URLS=https://your-frontend-domain
COOKIE_SAME_SITE=none
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://your-backend-domain/api/auth/google/callback
VAPID_PUBLIC_KEY=your_public_vapid_key
VAPID_PRIVATE_KEY=your_private_vapid_key
REDIS_URL=your_optional_redis_url
SENTRY_DSN=your_backend_sentry_dsn
SENTRY_ENVIRONMENT=production
APP_VERSION=backend-production
PRIVACY_POLICY_VERSION=v1.0
```

Start command:

```bash
npm start
```

## Security Notes

- Passwords are hashed with bcrypt.
- Auth uses bearer tokens and httpOnly refresh cookies.
- CORS is restricted through configured frontend origins.
- Helmet security headers are enabled.
- Request payloads are sanitized.
- Request validation uses Zod schemas.
- File upload size/type handling is implemented server-side.
- API routes use rate limiting, with Redis support when configured.
- Server and frontend errors can be reported to Sentry.

## Testing and Verification

Backend:

```bash
cd SwasthaParivar-Backend-main/SwasthaParivar-Backend-main
npm test
```

Frontend:

```bash
cd SwasthaParivar-Frontend-main/SwasthaParivar-Frontend-main
npm run lint
npm run build
```

Manual smoke test:

1. Start backend and verify `GET /health`.
2. Start frontend and open `http://localhost:5173`.
3. Sign up or sign in.
4. Create a family member.
5. Add a health record or reminder.
6. Open AI chat and send a health-related prompt.
7. Check reports/remedies flows if configured.

## Documentation

Additional project planning and completion notes live in:

```text
docs/
```

## Author

Built by Priyanshu Tiwari:

https://github.com/pds-37

## License

This project is licensed under the MIT License.
