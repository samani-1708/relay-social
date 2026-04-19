FROM node:20-alpine AS base
WORKDIR /app

# Declare build-time env vars — Next.js inlines NEXT_PUBLIC_* at compile time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# TODO: Remove this when we can remove the legacy API

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/platform-matrix/package.json ./packages/platform-matrix/
COPY packages/types/package.json ./packages/types/

RUN npm ci --workspace @relayman/web --workspace @relayman/platform-matrix --if-present

COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN npm run build --workspace @relayman/platform-matrix
RUN npm run build --workspace @relayman/web

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
