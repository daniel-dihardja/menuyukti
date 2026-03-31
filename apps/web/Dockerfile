# Build from repository root:
#   docker build -f apps/web/Dockerfile -t web \
#     --build-arg DATABASE_URL="postgresql://user:pass@localhost:5432/db" \
#     --build-arg ANALYTICS_API_URL="http://localhost:9999" .
#
# Runtime: pass real DATABASE_URL, ANALYTICS_API_URL, and any other Next.js env vars.

FROM node:20-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web ./apps/web
COPY packages/ui ./packages/ui
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config

RUN pnpm install --frozen-lockfile

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ARG ANALYTICS_API_URL=http://127.0.0.1:1
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ENV NODE_ENV=production \
    DATABASE_URL=${DATABASE_URL} \
    ANALYTICS_API_URL=${ANALYTICS_API_URL} \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    CLERK_SECRET_KEY=${CLERK_SECRET_KEY}

RUN pnpm --filter web build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
