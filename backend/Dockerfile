# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# bash and pg_dump (matching the Postgres 17 server) for scripts/backup-db.sh
RUN apk add --no-cache bash postgresql17-client

# Copy package files and prisma schema for postinstall script
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma/ ./prisma/

# Install production-only dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy generated Prisma Client and compiled assets from build stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/generated ./src/generated
COPY --from=builder /usr/src/app/src/generated ./dist/generated

# Backup script run by the in-app backup job (src/jobs/backup.job.ts)
COPY scripts/ ./scripts/

# Create uploads and backups directories and assign ownership to node user
RUN mkdir -p uploads backups && chown -R node:node /usr/src/app

USER node

# Expose server port
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start server: apply pending migrations, then start node server
CMD npx prisma migrate deploy && node dist/server.js
