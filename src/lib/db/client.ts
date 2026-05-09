import postgres from "postgres";

// Singleton pattern — prevents connection pool exhaustion in Next.js dev HMR
const globalForPg = globalThis as unknown as { pg: ReturnType<typeof postgres> };

export const sql =
  globalForPg.pg ??
  postgres(process.env.DATABASE_URL!, {
    max: 5, // Per CONTEXT.md decision: pool ceiling of 5
    ssl: false, // Internal Docker network — no SSL needed
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pg = sql;
}
