FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies at the monorepo root level
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/platform-matrix/package.json ./packages/platform-matrix/
COPY packages/types/package.json ./packages/types/

RUN npm ci --workspace @relayman/api --workspace @relayman/platform-matrix --if-present

# Copy source
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate Prisma client BEFORE tsc so the types are available during compilation
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build shared packages first, then the API
RUN npm run build --workspace @relayman/platform-matrix
RUN npm run build --workspace @relayman/api

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=base /app/apps/api/package.json ./apps/api/package.json
COPY --from=base /app/packages/ ./packages/
# Prisma schema + generated client needed at runtime (migrations + query engine)
COPY --from=base /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000

CMD ["node", "apps/api/dist/main"]
