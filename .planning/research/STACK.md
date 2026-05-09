# Technology Stack

**Project:** Utilities Tracker
**Researched:** 2026-05-09
**Confidence:** HIGH — all versions verified via npm registry; patterns verified via Context7/official docs

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x (currently 16.2.6) | Full-stack framework | App Router + Server Actions eliminates a separate API layer; `output: 'standalone'` produces a slim Docker image; consistent with other projects on this VPS. |
| React | 19.x (bundled with Next 15+) | UI rendering | Required by Next.js. |
| TypeScript | 5.x | Type safety | Catches schema/form mismatches at compile time — critical for data-entry apps where wrong types silently corrupt readings. |

**Why not Remix:** Remix is a fine alternative but this VPS already runs Next.js projects; stack consistency reduces operational surface area.

**Why not plain Express + React:** Server Actions give you type-safe mutations without writing REST endpoints. For a CRUD app with ~6 entity types, this is a significant DX win.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16 (already on VPS) | Primary datastore | Already running on this VPS; shared `POSTGRES_PASSWORD`; no new infrastructure. |
| Drizzle ORM | 0.45.x | Schema, queries, migrations | Type-safe SQL that reads like SQL; migration workflow (`drizzle-kit generate` + `drizzle-kit migrate`) is explicit and auditable; far lighter than Prisma for a simple schema. |
| postgres (driver) | 3.4.x | PostgreSQL wire protocol | The `postgres` npm package (postgres.js) is the recommended driver for Drizzle on Node.js; connection pooling built-in; no native bindings required (matters inside Docker). |
| drizzle-kit | 0.31.x | Migration CLI | Generates and applies SQL migration files; run as a one-shot `docker run --entrypoint` step before the app starts. |

**Why Drizzle over Prisma:** Prisma's binary engine adds ~50 MB to the Docker image and requires a separate `generate` step that complicates Docker builds. For a schema of ~5 tables, Drizzle's lightweight approach is the right fit.

**Why Drizzle over raw SQL:** Drizzle gives you TypeScript types for query results at zero runtime overhead. Without it, a typo in a column name silently returns `undefined` at runtime. For a personal app where data correctness matters (readings that feed predictions), type safety is worth it.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| iron-session | 8.0.x | Encrypted cookie sessions | Purpose-built for single-user password apps; zero database session tables needed; session data lives in a signed/encrypted cookie; integrates directly with Next.js App Router via `cookies()`. |
| bcryptjs | 2.x | Password hashing | Hash the one admin password stored in env; pure-JS (no native bindings), works in Docker without build tools. |

**Auth approach:** Store `APP_PASSWORD_HASH` in `/home/services/.env.production`. On login, compare with `bcryptjs.compare()`. On success, set `session.isLoggedIn = true` and `session.save()`. Middleware checks the session cookie on every request.

**Why not NextAuth/Auth.js:** Auth.js is designed for OAuth providers and multi-user flows. For a single hardcoded password, it adds 3-4 configuration files and a database sessions table for no benefit.

**Why not HTTP Basic Auth at the Cloudflare/Nginx layer:** Would work but gives no logout capability, no "session expired" UX, and no future extensibility. Cookie sessions are 30 lines of code and solve the UX problem cleanly.

---

### UI Components & Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui | current (copy-paste) | Component library | Already mandated by global conventions; Tailwind-native; zero bundle overhead; `Chart` component wraps Recharts with consistent theming. |
| Tailwind CSS | 4.3.x | Styling | Already mandated; pairs perfectly with shadcn. |
| tailwindcss-animate | latest | Transition animations | Required by shadcn components. |
| lucide-react | 1.14.x | Icons | Consistent with shadcn ecosystem; tree-shakeable. |
| next-themes | 0.4.x | Dark mode | SSR-safe; shadcn recommendation. |

---

### Charting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Recharts | 3.8.x | Time-series graphs | **Already bundled inside shadcn/ui charts** — no separate installation needed when using `shadcn add chart`. The `ChartContainer` + `ResponsiveContainer` pattern handles mobile viewports correctly; `aspect` prop maintains usable chart height on small screens. |

**Chart approach:** Use shadcn's `ChartContainer` wrapper around Recharts `LineChart` for both oil (tank height over time with depletion projection line) and electricity (monthly kWh bars + cost overlay). This keeps theming consistent with the rest of the UI and avoids maintaining two charting systems.

**Why not Chart.js / react-chartjs-2:** Heavier bundle, worse React integration, no shadcn wrapper. Recharts via shadcn is the obvious choice given the mandated stack.

**Why not Tremor:** Tremor v4 dropped many components and is in maintenance mode. Its charts are also Recharts underneath — using shadcn charts directly is more direct.

---

### Forms & Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | 4.4.x | Schema validation | Validates Server Action inputs server-side; defines TypeScript types from schemas (single source of truth). |
| react-hook-form | 7.75.x | Client form state | Manages client-side field state, error display, and submission; integrates with Zod via `@hookform/resolvers`. |
| @hookform/resolvers | 5.2.x | Zod ↔ RHF bridge | Passes Zod schema to react-hook-form for client-side pre-validation before Server Action call. |

**Why both RHF + Zod:** RHF handles the client UX (touched state, field errors, submit disable). Zod validates on the server — never trust the client. The resolver means you write the schema once and get validation on both sides.

---

### Utilities

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| date-fns | 4.1.x | Date formatting/arithmetic | Format reading dates for chart axes and table display; calculate days-until-contract-expiry for alerts. Pure functions, tree-shakeable, no `moment.js` weight. |

---

## Infrastructure

### Docker

Use `output: 'standalone'` in `next.config.ts`. This traces all dependencies and produces a `.next/standalone/` directory that can be launched with `node server.js` — no `node_modules` copy needed. The resulting Docker image is ~200-300 MB rather than 1+ GB.

```dockerfile
# Multi-stage: builder → runner
FROM node:22-alpine AS builder
# ... build steps ...
RUN npm run build

FROM node:22-alpine AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
```

**Migrations:** Run `drizzle-kit migrate` as a separate one-shot container (or a Docker Compose `depends_on` + `condition: service_completed_successfully`) before the app container starts.

### Docker Compose

Add to `/home/services/hetzner-vps/docker-compose.yml`:

```yaml
utilities-tracker:
  image: utilities-tracker:latest
  env_file: /home/services/.env.production
  restart: unless-stopped
  # No exposed ports — Cloudflare Tunnel connects internally
```

### Cloudflare Tunnel

Add ingress rule to `/home/services/hetzner-vps/config.yml`:

```yaml
- hostname: utilities.yourdomain.com
  service: http://utilities-tracker:3000
```

---

## Full Package List

### Production dependencies

```bash
npm install next react react-dom
npm install drizzle-orm postgres
npm install iron-session bcryptjs
npm install recharts          # pulled in automatically by shadcn chart
npm install lucide-react next-themes date-fns
npm install zod react-hook-form @hookform/resolvers
```

### Dev dependencies

```bash
npm install -D typescript @types/node @types/react @types/react-dom @types/bcryptjs
npm install -D drizzle-kit
npm install -D tailwindcss @tailwindcss/typography tailwindcss-animate
npm install -D postcss autoprefixer
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 15 | Remix | Stack consistency with other VPS projects; Next.js standalone Docker output is mature |
| ORM | Drizzle ORM | Prisma | Prisma binary engine bloats Docker image; overkill for 5-table schema |
| ORM | Drizzle ORM | raw SQL (pg) | Raw SQL loses TypeScript types on query results; Drizzle adds near-zero overhead |
| Auth | iron-session | Auth.js / NextAuth | Auth.js designed for OAuth + multi-user; 10x the complexity for a single password |
| Auth | iron-session | HTTP Basic Auth | No logout, no session expiry, poor UX on mobile |
| Charts | Recharts (via shadcn) | Chart.js | Heavier bundle, worse React integration, no shadcn theming |
| Charts | Recharts (via shadcn) | Tremor | Tremor v4 in maintenance mode; its charts are Recharts underneath anyway |
| Validation | Zod | Yup | Zod v4 is faster, better TypeScript inference, and more actively maintained |
| DB Driver | postgres.js | node-postgres (pg) | postgres.js has no native bindings (Docker-friendly), better async/await ergonomics |

---

## Sources

- Next.js App Router / Docker: Context7 `/vercel/next.js` — HIGH confidence
- iron-session pattern: Context7 `/vvo/iron-session` — HIGH confidence
- Drizzle ORM + postgres.js: Context7 `/replit/drizzle-orm` — HIGH confidence
- shadcn chart wrapping Recharts: Context7 `/shadcn-ui/ui` — HIGH confidence (explicitly stated in shadcn docs)
- All package versions: npm registry (2026-05-09) — HIGH confidence
