# relayman — Post Broadcasting HLD

_Date: 2026-04-10_

## Current State (What Exists)

```
[Cron: every 1min]
  └─ PollerService.pollAllOrigins()
       └─ polls each origin account via HTTP
            └─ PostsService.ingestPost()          ← synchronous
                 └─ BroadcasterService.dispatchBroadcast()  ← synchronous
                      └─ executeBroadcastJob()    ← fire-and-forget Promise
```

**Problems with current approach:**
- Poller and broadcaster are tightly coupled and synchronous. A slow platform API blocks the entire poll cycle.
- No retry backoff — on failure, `retryCount` is incremented but nothing re-enqueues the job.
- Scheduled posts (from the Editor) are not supported.
- No concurrency control — all users and all platforms run simultaneously in the same event loop.
- `BroadcasterWorkerService` is a stub with TODO comments.

---

## Proposed Architecture

**Queue engine: BullMQ over Redis** (already in stack, already referenced in the codebase)

Kafka adds significant operational complexity (ZooKeeper/KRaft, partition management, consumer groups) and is only worth it at millions of events/day. BullMQ gives you: delayed jobs (scheduled posting), retries with exponential backoff, per-queue concurrency limits, job prioritization, and a dashboard — all from the Redis you already have.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         relayman API (NestJS)                │
│                                                             │
│  ┌──────────────┐     ┌─────────────────────────────────┐  │
│  │PollerService │     │      EditorController            │  │
│  │(Cron/1min)   │     │  POST /editor/publish            │  │
│  └──────┬───────┘     └────────────┬────────────────────┘  │
│         │                          │                         │
│         ▼                          ▼                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             INGESTION QUEUE (BullMQ)                 │    │
│  │  Queue: "post-ingestion"                             │    │
│  │  Job payload:                                        │    │
│  │  { userId, originContent, originPlatform,            │    │
│  │    originPostId, mediaUrls, scheduledAt? }           │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            PostIngestionWorker                       │    │
│  │  1. Check skipHashtag in content → skip if match    │    │
│  │  2. Deduplicate by originPostId                     │    │
│  │  3. Create Post record (status: PENDING)            │    │
│  │  4. Load user's target accounts                     │    │
│  │  5. adaptContent() per platform                     │    │
│  │  6. Create BroadcastJob records (status: QUEUED)    │    │
│  │  7. Enqueue one BroadcastJob per target platform    │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│          ┌──────────────┼──────────────┐                    │
│          ▼              ▼              ▼                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ Queue:    │  │ Queue:    │  │ Queue:    │  ...         │
│  │"broadcast │  │"broadcast │  │"broadcast │              │
│  │ -twitter" │  │ -bluesky" │  │-linkedin" │              │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘              │
│        │              │              │                      │
│        ▼              ▼              ▼                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           BroadcastWorker (per queue)                │   │
│  │  1. Fetch BroadcastJob + decrypted account tokens   │   │
│  │  2. Upload media to target platform if needed       │   │
│  │  3. Call platform adapter (Twitter/Bluesky/etc.)    │   │
│  │  4. Update BroadcastJob: status=SENT, sentPostIds   │   │
│  │  5. Update parent Post status aggregate             │   │
│  │  On failure:                                        │   │
│  │  - BullMQ auto-retries (exp. backoff, max 3)        │   │
│  │  - After final failure: status=FAILED,              │   │
│  │    create Notification, send email if enabled       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           TokenRefreshWorker (Cron / Queue)          │   │
│  │  Every 30min: check tokens expiring within 1hr      │   │
│  │  Enqueue refresh job per account                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                    Redis (BullMQ)
```

---

## Queue Design

### Queue 1: `post-ingestion`
| Property | Value |
|----------|-------|
| Concurrency | 10 (global) |
| Attempts | 3 |
| Backoff | exponential, 5s base |
| Delay support | Yes — `scheduledAt` becomes BullMQ `delay` |
| Deduplication | `jobId = originPostId` (BullMQ deduplicates by job ID) |

### Queues 2-N: `broadcast-{platform}` (one per platform)
| Property | Value |
|----------|-------|
| Concurrency per queue | Twitter: 5, LinkedIn: 3, YouTube: 1, others: 5 |
| Attempts | 3 |
| Backoff | exponential, 10s → 100s → 1000s |
| Priority | 1-10 (editor posts get priority 1, poller posts get 5) |

**Why per-platform queues?** YouTube uploads are slow (minutes); putting them in a shared queue would starve Twitter jobs. Per-platform queues let you tune concurrency independently.

### Queue 3: `token-refresh`
| Property | Value |
|----------|-------|
| Triggered by | Cron every 30min scans DB, enqueues per-account refresh jobs |
| Attempts | 2 |

---

## Data Flow: Detailed Steps

### A. Polling Path (existing posts on origin platform)

```
1. PollerService (Cron, every 60s)
   → Query all PlatformAccounts where isOrigin=true AND isActive=true
   → For each account: call platform API to get new posts since lastSeenPostId
   → If new posts found:
       → Enqueue job to "post-ingestion" queue
         { userId, originContent, originPlatform, originPostId, mediaUrls }
       → Update account.lastSeenPostId, account.lastPolledAt

2. PostIngestionWorker consumes job
   → Skip if content contains skipHashtag (from UserSettings)
   → Skip if Post with originPostId already exists (idempotency)
   → Create Post record
   → Load target accounts (isTarget=true, isActive=true)
   → For each target: adaptContent(), create BroadcastJob, enqueue to "broadcast-{platform}"

3. BroadcastWorker (per platform) consumes job
   → Load BroadcastJob + PlatformAccount (with decrypted tokens)
   → Upload media if needed (platform-specific)
   → Call platform adapter
   → Mark BroadcastJob SENT or FAILED
   → Update parent Post aggregate status
```

### B. Editor / Manual Post Path

```
1. User submits post via Editor UI
   → POST /editor/publish { content, mediaUrls, platforms[], scheduledAt? }
   → API creates Post record (source="editor")
   → Enqueue to "post-ingestion" with delay = scheduledAt - now (or 0 for immediate)

2. Same worker path as above (step 2 and 3)
```

### C. Token Refresh Path

```
1. Cron every 30min:
   → Query PlatformAccounts where tokenExpiresAt < now+1hr AND isActive=true
   → Enqueue one "token-refresh" job per account

2. TokenRefreshWorker:
   → Decrypt current tokens
   → Call OAuthService.refresh{Platform}Token()
   → On success: update DB with new tokens
   → On failure after retries: mark account inactive, create Notification
```

---

## Schema Changes Required

### `Post` — add scheduling support
```prisma
model Post {
  ...
  scheduledAt     DateTime?    // null = immediate, future = scheduled
  source          String       @default("origin") // "origin" | "editor"
}
```

### `UserSettings` — add per-platform targeting
```prisma
model UserSettings {
  ...
  targetPlatforms   String[]  @default([])  // [] = all connected targets
  pollingEnabled    Boolean   @default(true)
}
```

### `BroadcastJob` — no changes needed (retryCount, errorMessage already exist)

---

## Module Structure Changes

```
src/
  modules/
    posts/
      poller.service.ts          ← keep, but: emit to queue instead of calling PostsService directly
      posts.service.ts           ← keep for HTTP-triggered ingestion
      post-ingestion.worker.ts   ← NEW: BullMQ worker consuming "post-ingestion"
      posts.module.ts            ← register new worker + BullMQ module
    broadcaster/
      broadcaster.service.ts     ← keep dispatchBroadcast, but: enqueue instead of inline execute
      broadcast.worker.ts        ← NEW: BullMQ worker consuming "broadcast-{platform}"
      broadcaster-worker.service.ts  ← REPLACE stub with real BullMQ initialization
      broadcaster.module.ts      ← register BullMQ queues
    accounts/
      token-refresh.service.ts   ← keep cron, but: enqueue jobs instead of inline refresh
      token-refresh.worker.ts    ← NEW: BullMQ worker consuming "token-refresh"
  common/
    queues/
      queue.constants.ts         ← NEW: queue name constants
      bullmq.module.ts           ← NEW: shared BullMQ module with Redis connection
```

---

## Retry & Failure Policy

| Scenario | Action |
|----------|--------|
| Platform API 429 (rate limit) | Retry with backoff. BullMQ reads `Retry-After` header if adapter throws structured error. |
| Platform API 401 (token expired) | Trigger token refresh inline, retry once. If refresh fails: mark account inactive, notify user. |
| Platform API 5xx | Retry up to 3 times with exponential backoff. |
| Final failure (3 attempts exhausted) | Set BroadcastJob.status=FAILED, create Notification, send email if `emailNotifications=true`. |
| Post has 0 successful broadcasts | Set Post.status=FAILED. |
| Post has mixed success/failure | Set Post.status=DONE (partial). Store per-job status in BroadcastJob. |

---

## Media Handling

Current: `originMediaUrls` stores URLs (typically from the origin platform CDN). These URLs may expire or be behind auth.

**Solution:**
1. When ingesting: download media from origin URL, upload to R2 (Cloudflare), store permanent R2 URL in `originMediaUrls`.
2. When broadcasting: each platform adapter downloads from R2 URL and uploads to target platform using its own media API.

This is a separate concern (a `MediaIngestionQueue` step) and can be deferred to Phase 2 if R2 isn't configured yet.

---

## New Dependencies

```json
// Already have: redis, @nestjs/schedule
// Add:
"@nestjs/bullmq": "^10.x",   // NestJS BullMQ integration
"bullmq": "^5.x"              // BullMQ itself
```

No Kafka. No separate process. Everything runs in the same NestJS API process. Workers are just BullMQ `Worker` instances registered as NestJS services — they consume from Redis queues automatically when the app starts.

---

## What Does NOT Change

- All platform adapters (`twitter.adapter.ts`, `bluesky.adapter.ts`, etc.) — zero changes.
- All OAuth flows and account connection logic — zero changes.
- `content-adapter.ts` — zero changes.
- Prisma schema minimal changes (just `scheduledAt` and `targetPlatforms`).
- `AuthGuard`, web frontend — zero changes.

---

## Implementation Order

1. Install BullMQ, create shared queue module with Redis connection
2. Create `post-ingestion` queue + worker (replaces `PostsService.ingestPost` inline path)
3. Create per-platform `broadcast-{platform}` queues + single worker class
4. Replace `BroadcasterWorkerService` stub with real worker registration
5. Update `PollerService` to enqueue instead of calling `PostsService` directly
6. Update `TokenRefreshService` to enqueue instead of inline refresh
7. Prisma migration: add `scheduledAt` to `Post`, `targetPlatforms` + `pollingEnabled` to `UserSettings`
8. Wire `EditorController` to enqueue with optional delay for scheduled posts

---

## Continuation Prompt

Paste this into a new conversation to continue implementation:

> **Context:** relayman is a NestJS + Next.js 14 social broadcasting app in a Turborepo monorepo (`apps/api` port 4000, `apps/web` port 3000). Redis is at `redis://localhost:6379`, Postgres via Prisma. The stack already has BullMQ referenced but not wired up (`broadcaster-worker.service.ts` is a stub).
>
> **Task:** Implement the BullMQ-based post broadcasting pipeline per the HLD we agreed on. The implementation order is:
> 1. Install `@nestjs/bullmq` + `bullmq`. Create `src/common/queues/queue.constants.ts` (queue name strings) and `src/common/queues/bullmq.module.ts` (shared BullMQ module using `REDIS_URL` from ConfigService).
> 2. Create `src/modules/posts/post-ingestion.worker.ts` — BullMQ Worker consuming `post-ingestion` queue. Logic: skipHashtag check → idempotency check on `originPostId` → create Post → load target accounts → `adaptContent()` per platform → create BroadcastJobs → enqueue to `broadcast-{platform}` queues. Concurrency: 10.
> 3. Update `PollerService` to enqueue to `post-ingestion` queue instead of calling `PostsService.ingestPost()` directly.
> 4. Create `src/modules/broadcaster/broadcast.worker.ts` — BullMQ Worker class (one instance, handles all platforms via queue name). Logic: load BroadcastJob + decrypt tokens via `AccountsService.getAccountWithTokens()` → call adapter via `BroadcasterService.sendToAdapter()` → update BroadcastJob status → update parent Post status. On final failure (3 attempts): create Notification + send email. Concurrency: Twitter 5, LinkedIn 3, YouTube 1, others 5.
> 5. Replace `broadcaster-worker.service.ts` stub with real `BullMQ Worker` registrations for each platform queue, pointing to `BroadcastWorker.process()`.
> 6. Update `TokenRefreshService` to enqueue refresh jobs per account instead of refreshing inline.
> 7. Prisma migration: add `scheduledAt DateTime?` to `Post`, add `targetPlatforms String[]` and `pollingEnabled Boolean` to `UserSettings`.
> 8. Update `EditorController`/service to enqueue with BullMQ `delay` if `scheduledAt` is in the future.
>
> Key files to read first: `src/modules/posts/poller.service.ts`, `src/modules/broadcaster/broadcaster.service.ts`, `src/modules/broadcaster/broadcaster-worker.service.ts`, `src/modules/posts/posts.service.ts`, `src/app.module.ts`, `prisma/schema.prisma`.
