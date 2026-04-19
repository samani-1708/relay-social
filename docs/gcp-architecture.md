# GCP Hosting Architecture

## Current stack → GCP equivalents

| Current | GCP replacement | Notes |
|---|---|---|
| PostgreSQL (self-hosted) | **Cloud SQL for PostgreSQL** | Zero schema changes. Same Prisma driver. Enable `pgBouncer` for connection pooling. |
| BullMQ + Redis | **Cloud Tasks** (HTTP-target queues) | See detailed migration below. |
| Redis (BullMQ sessions) | **Cloud Memorystore (Redis)** | Keep Redis for now; can migrate to Firestore later. |
| NestJS monolith | **Cloud Run** (containerised) | Stateless, auto-scaling, cold starts < 1 s. |
| Next.js | **Cloud Run** or **Firebase Hosting + Cloud Run** | `next start` on Cloud Run works perfectly. |
| File storage (future) | **Cloud Storage (GCS)** | Media CDN for Instagram/TikTok URL-pull. |

---

## BullMQ → Cloud Tasks migration

BullMQ requires a persistent Redis connection which complicates serverless scaling.
Cloud Tasks sends HTTP requests to your workers — stateless, no Redis dependency.

### How it would work

1. Instead of `queueService.get(queueName).add(...)`, call Cloud Tasks to create a task that POSTs to `https://api.relayman.run/internal/broadcast/:platform` with `{ broadcastJobId }` body.
2. Each platform gets its own queue in Cloud Tasks (one queue = one platform = configurable rate limit).
3. Cloud Tasks handles retries (configurable max attempts + backoff) and dead-letter queues.
4. Your API authenticates inbound Cloud Tasks requests via the `X-CloudTasks-QueueName` header and an OIDC token.

### What stays the same

- `BroadcastJob` DB records, status tracking, error messages — unchanged.
- All adapters — unchanged.
- `BroadcasterService.executeBroadcastJob()` — unchanged (called by the new HTTP handler instead of BullMQ worker).

### Rate limiting

Cloud Tasks queues have built-in `maxDispatchesPerSecond` and `maxConcurrentDispatches`. This replaces `BROADCAST_CONCURRENCY` in queue.constants.ts.

---

## Scaling the monolith on Cloud Run

The NestJS API is already stateless (tokens in DB, no local state). Cloud Run:

- Scales to 0 when idle (cost-effective)
- Scales up in seconds under load
- Set `--min-instances=1` for the API to avoid cold-start latency on first request after idle

### Session / JWT

Current JWTs are stateless (no server-side session store needed). Keep as-is.
If you add refresh token rotation, store revoked tokens in Cloud Memorystore (Redis) with a TTL matching the original JWT expiry.

---

## Separate session service (optional)

If you want a dedicated session service (e.g. for SSO, audit logs):

- Create a new NestJS app `apps/sessions` that owns `/auth/*` routes.
- API Gateway (Cloud Endpoints or Apigee) routes `/auth` → sessions service, everything else → main API.
- Both services share Cloud SQL and Cloud Memorystore via VPC connector.
- Token validation can be done at the API Gateway layer (zero-trust).

For the current scale this is premature — the monolith on Cloud Run scales horizontally without any changes.

---

## Media CDN for Instagram/TikTok

Instagram and TikTok's PULL_FROM_URL approach requires a public, stable URL for media.

**Recommended flow:**

1. When a broadcast job needs to send media to Instagram/TikTok, upload the buffer to GCS:
   ```
   gs://relayman-media-tmp/jobs/{broadcastJobId}/{filename}
   ```
2. Make the object public (or generate a signed URL valid for 1 hour).
3. Pass the URL to the Instagram/TikTok API.
4. After successful broadcast, delete the GCS object (or rely on a 24h lifecycle rule on the bucket).

**GCS bucket config:**
```
Lifecycle rule: delete objects older than 1 day
CORS: allow GET from any origin
```

**Code change:** Add `GcsMediaStorageService` implementing a `MediaStorageService` interface:
```typescript
interface MediaStorageService {
  store(buffer: Buffer, mimeType: string, jobId: string): Promise<string>; // returns public URL
  delete(url: string): Promise<void>;
}
```

---

## Summary

1. **Cloud SQL**: Drop-in replacement. Update `DATABASE_URL` env var.
2. **Cloud Run**: `docker build + gcloud run deploy`. Zero code changes.
3. **Cloud Tasks**: Replace BullMQ queue adds with Cloud Tasks HTTP tasks. ~50 lines of code.
4. **Cloud Memorystore**: Update Redis URL env var.
5. **GCS**: Add `GcsMediaStorageService` for Instagram/TikTok media (new feature).
6. **Sessions as separate service**: Optional, do it when you need SSO or audit logs.

> **Don't split the monolith prematurely.** Cloud Run auto-scales the monolith. Extract services only when a specific component needs independent scaling or a different language/framework.
