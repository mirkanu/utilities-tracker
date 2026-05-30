import "server-only";
import { db } from "@/lib/db/db";
import { dailyTemperatures } from "@/lib/db/schema";
import { desc, asc, between, sql } from "drizzle-orm";

export type DailyTemp = {
  date: string;       // "YYYY-MM-DD"
  avgTempC: number;
  hdd: number;
};

function londonToday(): string {
  // "YYYY-MM-DD" in Europe/London time. en-CA locale outputs ISO-style.
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

async function refreshFromOpenMeteo(startDate: string, endDate: string): Promise<void> {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", "54.92");
  url.searchParams.set("longitude", "-6.22");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "Europe/London");

  const resp = await fetch(url.toString(), { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`Open-Meteo API responded ${resp.status}: ${resp.statusText}`);
  }
  const data = await resp.json();

  const dates: string[] = data?.daily?.time ?? [];
  const maxes: (number | null)[] = data?.daily?.temperature_2m_max ?? [];
  const mins: (number | null)[] = data?.daily?.temperature_2m_min ?? [];
  const today = londonToday();

  const rows = dates
    .map((date, i) => {
      const mx = maxes[i];
      const mn = mins[i];
      if (mx == null || mn == null) return null;
      const avg = (mx + mn) / 2;
      return {
        date,
        avgTempC: avg.toFixed(2),
        hdd: Math.max(0, 15.5 - avg).toFixed(2),
        fetchedAt: today,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return;

  await db
    .insert(dailyTemperatures)
    .values(rows)
    .onConflictDoUpdate({
      target: dailyTemperatures.date,
      set: {
        avgTempC: sql`excluded.avg_temp_c`,
        hdd: sql`excluded.hdd`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    });
}

export async function fetchTemperatures(
  startDate: string,
  endDate: string
): Promise<DailyTemp[]> {
  const today = londonToday();

  const lastFetch = await db
    .select({ fetchedAt: dailyTemperatures.fetchedAt })
    .from(dailyTemperatures)
    .orderBy(desc(dailyTemperatures.fetchedAt))
    .limit(1);

  const alreadyFetchedToday = lastFetch[0]?.fetchedAt === today;
  if (!alreadyFetchedToday) {
    await refreshFromOpenMeteo(startDate, endDate);
  }

  const rows = await db
    .select({
      date: dailyTemperatures.date,
      avgTempC: dailyTemperatures.avgTempC,
      hdd: dailyTemperatures.hdd,
    })
    .from(dailyTemperatures)
    .where(between(dailyTemperatures.date, startDate, endDate))
    .orderBy(asc(dailyTemperatures.date));

  // numeric() comes back as string from postgres.js — coerce to number for clients
  return rows.map((r) => ({
    date: r.date,
    avgTempC: parseFloat(r.avgTempC as unknown as string),
    hdd: parseFloat(r.hdd as unknown as string),
  }));
}
