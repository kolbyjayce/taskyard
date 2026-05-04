# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Copy manifests first so dependency install is cached independently of source.
COPY package.json package-lock.json ./
COPY packages/cli/package.json ./packages/cli/

RUN npm ci --workspace=taskyard

# Copy source and compile.
COPY packages/cli/src ./packages/cli/src
COPY packages/cli/tsconfig.json ./packages/cli/
COPY tsconfig.json ./

RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# Run as a non-root user.
RUN addgroup -S taskyard && adduser -S taskyard -G taskyard

WORKDIR /app

# Only production deps + compiled output.
COPY package.json package-lock.json ./
COPY packages/cli/package.json ./packages/cli/

RUN npm ci --workspace=taskyard --omit=dev

COPY --from=builder /build/packages/cli/dist ./packages/cli/dist

# Task data is stored here; mount a volume to persist it across container restarts.
RUN mkdir -p /data && chown taskyard:taskyard /data

USER taskyard

# TASKYARD_AUTH_TOKEN — set to a secret string to enable bearer-token auth.
# Leave unset for open/unauthenticated mode (e.g. local or trusted-network use).
ENV TASKYARD_AUTH_TOKEN=""

EXPOSE 3000

ENTRYPOINT ["node", "/app/packages/cli/dist/index.js"]
CMD ["start", "--transport", "http", "--port", "3000", "--root", "/data"]
