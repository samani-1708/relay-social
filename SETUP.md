# relayman — Setup Guide

## Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm

## Quick Start

### 1. Install dependencies
```bash
cd relayman
npm install
```

### 2. Configure environment
```bash
cp .env.example apps/api/.env
# Edit apps/api/.env — at minimum fill in JWT_SECRET
```

### 3. Start local infrastructure (PostgreSQL + Redis + MinIO)
```bash
docker compose --profile local-db --profile local-redis --profile local-storage up -d
```

> **Tip:** add this alias to your shell so you don't have to type it every time:
> ```bash
> alias dc-infra='docker compose --profile local-db --profile local-redis --profile local-storage'
> # then: dc-infra up -d  /  dc-infra down
> ```

Services started:
| Service | URL |
|---|---|
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| MinIO S3 API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` (user: `minioadmin` / `minioadmin`) |

### 4. Run database migrations
```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

### 5. Start development servers

**Terminal 1 — API (NestJS on :4000)**
```bash
cd apps/api
npm run dev
```

**Terminal 2 — Web (Next.js on :3000)**
```bash
cd apps/web
npm run dev
```

Open http://localhost:3000

---

## What's in apps/api/.env for storage

The API reads these on boot. Default values match the docker compose setup above:

```env
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=relayman-media
STORAGE_PUBLIC_BASE_URL=http://localhost:9000/relayman-media
```

If these are missing or MinIO isn't running, the API still boots and works normally —
it just logs a warning and skips uploads for Instagram/TikTok broadcasts.

---

## Production (GCP Compute Engine)

```bash
# Copy and fill in .env (JWT_SECRET, OAuth keys, STORAGE_PUBLIC_BASE_URL=http://<VM_IP>:9000/relayman-media)
cp .env.example .env

# Build and start everything
docker compose --profile local-db --profile local-redis --profile local-storage up -d --build
```

### Switching to managed cloud services (GCP)

| Service | What to do |
|---|---|
| **Cloud SQL** | Set `DATABASE_URL=postgresql://user:pass@<PRIVATE_IP>:5432/relayman`, drop `--profile local-db` |
| **Cloud Memorystore** | Set `REDIS_URL=redis://<PRIVATE_IP>:6379`, drop `--profile local-redis` |
| **Cloud Storage (GCS)** | Set `STORAGE_PROVIDER=gcs` + `GCS_PROJECT_ID` + `GCS_BUCKET`, drop `--profile local-storage` |

On a GCE VM, GCS auth uses Application Default Credentials automatically — no key file needed.

---

## API Documentation
Swagger UI: http://localhost:4000/api/docs

---

## Platform Setup Notes

### BlueSky
No API registration needed. Users create an App Password at:
`bsky.app → Settings → Privacy and Security → App Passwords`

### Mastodon
No registration needed. Users enter their instance URL and authorize via OAuth.

### Twitter/X
Requires Twitter Developer account + Basic API tier ($100/mo):
1. Register at developer.twitter.com
2. Set `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` in .env
3. Add callback URL: `http://localhost:4000/api/accounts/oauth/twitter/callback`

### Meta (Facebook, Instagram, Threads)
One app for all three:
1. Register at developers.facebook.com
2. Add products: Instagram Graph API, Threads API, Facebook Login
3. Set `META_APP_ID` and `META_APP_SECRET` in .env
4. Add callback URL: `http://localhost:4000/api/accounts/oauth/meta/callback`
5. Submit for App Review to enable `threads_content_publish`, `instagram_content_publish`, `pages_manage_posts`

### LinkedIn
1. Register at linkedin.com/developers
2. Add "Share on LinkedIn" product
3. Set `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` in .env
4. Add callback URL: `http://localhost:4000/api/accounts/oauth/linkedin/callback`

### Email (Resend)
1. Sign up at resend.com
2. Set `RESEND_API_KEY` in .env
3. Set `EMAIL_FROM` to a verified domain address

---

## Project Structure
```
relayman/
├── apps/
│   ├── api/          # NestJS backend (:4000)
│   │   ├── Dockerfile
│   │   ├── prisma/   # DB schema & migrations
│   │   └── src/
│   │       ├── common/
│   │       │   ├── media/        # Download + upload media pipeline
│   │       │   └── storage/      # Storage provider abstraction
│   │       │       └── providers/
│   │       │           ├── storage-provider.interface.ts
│   │       │           ├── s3.provider.ts   # MinIO / AWS S3 / R2
│   │       │           └── gcs.provider.ts  # Google Cloud Storage
│   │       └── modules/
│   │           ├── auth/
│   │           ├── accounts/
│   │           ├── posts/
│   │           ├── broadcaster/
│   │           ├── editor/
│   │           ├── notifications/
│   │           └── settings/
│   └── web/          # Next.js frontend (:3000)
│       ├── Dockerfile
│       └── app/
│           ├── page.tsx
│           ├── auth/
│           ├── dashboard/
│           └── editor/
├── packages/
│   ├── platform-matrix/  # canonical platform capability data
│   └── types/
├── docker-compose.yml    # profiles: local-db, local-redis, local-storage
├── nginx.conf
└── .env.example
```
