# Stage 1: Install ALL dependencies (dev included — needed for TypeScript build)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Install production-only dependencies (no devDeps — leaner runner image)
FROM node:20-alpine AS deps-prod
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage 3: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build 2>&1 || (echo "=== BUILD FAILED ===" && exit 1)

# Stage 4: Production runner — standalone output + prod node_modules only
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Europe/London

# Install tsx globally for running TypeScript migration script at startup.
# tsx is NOT in production node_modules (it is a devDependency), so it must be
# installed here. postgres and drizzle-orm ARE production deps and are included
# via deps-prod, so migrate.ts can import them at runtime.
RUN npm install -g tsx

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public* ./public/
# drizzle/ SQL files MUST be in image — migrator reads these at startup
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
# Use production-only node_modules (excludes drizzle-kit, typescript, tsx, etc.)
COPY --from=deps-prod /app/node_modules ./node_modules

EXPOSE 3000

# Run migrations then start the Next.js standalone server.
# The || clause makes migration failure visible in container logs before aborting.
CMD sh -c "tsx scripts/migrate.ts || (echo 'MIGRATION FAILED — aborting startup' && exit 1); node server.js"
