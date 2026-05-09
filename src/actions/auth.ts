"use server";

import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

function passwordsMatch(supplied: string, expected: string): boolean {
  // Pad both to the same max length to prevent length-based timing leakage
  const maxLen = Math.max(supplied.length, expected.length);
  const suppliedBuf = Buffer.from(supplied.padEnd(maxLen));
  const expectedBuf = Buffer.from(expected.padEnd(maxLen));
  // Also compare raw lengths — timingSafeEqual only checks byte equality
  return (
    supplied.length === expected.length &&
    timingSafeEqual(suppliedBuf, expectedBuf)
  );
}

export async function login(
  _prevState: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean }> {
  const supplied = (formData.get("password") as string) ?? "";
  const expected = process.env.UTILITIES_PASSWORD ?? "";

  if (!supplied || !passwordsMatch(supplied, expected)) {
    return { error: "Incorrect password" };
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.isLoggedIn = true;
  await session.save();

  // Return success — client navigates to /oil via useRouter to avoid
  // Next.js 15 bug where cookies().set() + redirect() clears the cookie
  return { error: "", ok: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.destroy();
  redirect("/login");
}
