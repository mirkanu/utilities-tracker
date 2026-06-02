# Utilities Tracker

> **Personal project:** This was built to solve a specific problem for the author. It works for that purpose. It has not been tested for general deployment and is not actively maintained — use it as inspiration or a starting point, not a supported tool.

> **100% AI-generated:** No code was written by hand. Every file was produced by [Claude Code](https://claude.ai/claude-code) via the [GSD workflow](https://github.com/open-gsd/gsd-core). The author is a non-programmer building personal tools with AI. PRs are welcome — if one arrives, Claude Code will review and merge it. Issues are unlikely to receive a response.

A mobile-first web app for tracking home energy usage — heating oil and electricity. You log your oil tank height readings, purchases, and electricity meter readings manually; the app turns that data into charts, consumption trends, depletion predictions, and contract expiry warnings. It's built for one person who wants to know at a glance how much oil is left, when it will run out, and whether their electricity contract is about to expire.

- **Oil tank tracking** — log readings in cm, see litres remaining, get a depletion prediction based on your actual consumption rate since the last top-up
- **Electricity tracking** — log meter readings and bills separately; track cost and kWh over time with your contract details (unit rate, standing charge, expiry)
- **Multi-year oil analytics** — overlaid yearly consumption charts with calendar-year or heating-season grouping, monthly breakdown, and historical temperature overlay via Open-Meteo
- **Anomaly detection** — flags months where consumption is unusually high or low compared to your 12-month rolling median
- **Market price comparison** — shows what you paid per litre vs the BEIS UK domestic heating oil benchmark for each purchase
- **Contract expiry warnings** — tiered alerts (amber at 31–90 days, red at 30 days or less) so you never get caught on an expired tariff

> **Tip:** Not sure where to start? Paste the link to this page into [Claude](https://claude.ai), [ChatGPT](https://chat.openai.com), or any AI assistant and ask it to walk you through the setup. These tools can read GitHub pages and guide you step by step.

## Quick setup

1. **Clone the repo** and `cd` into it
2. **Copy the example env** — create a `.env.local` (or `.env.production` for Docker) with:
   - `SESSION_PASSWORD` — any random 32+ character string (used to encrypt the login cookie)
   - `DATABASE_URL` — PostgreSQL connection string, e.g. `postgres://user:pass@localhost:5432/utilities`
   - `APP_PASSWORD` — the password you will use to log in
3. **Run database migrations** — `npx drizzle-kit migrate` (or they run automatically on Docker startup)
4. **Start the app locally** — `npm install && npm run dev` then open `http://localhost:3000`
5. **Deploy with Docker** — `docker compose up -d` (requires Docker Compose v2; set `TZ=Europe/London` in your compose env for correct BST handling)
6. **Put it behind a reverse proxy** — Nginx, Caddy, or Cloudflare Tunnel; the app listens on port 3000

If you want Cloudflare Access login instead of the built-in password, set that up in the Cloudflare dashboard (Zero Trust → Access → Applications) and remove the `APP_PASSWORD` check.

## Stack

- **Next.js 15** — App Router, `output: 'standalone'` for Docker
- **PostgreSQL** via Drizzle ORM + postgres.js
- **iron-session** — single-user password login, encrypted cookie
- **Recharts** via shadcn `ChartContainer` — all charts
- **shadcn/ui v4 + Tailwind CSS v4** — UI components and styling
- **Open-Meteo** — free historical temperature data (no API key needed)
- **BEIS** — UK domestic heating oil price benchmark (public dataset)
- **Docker Compose** — single-container deployment on a VPS
