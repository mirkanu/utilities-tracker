import type { SessionOptions } from "iron-session";

export interface SessionData {
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  // UTILITIES_SESSION_SECRET must be set at runtime (min 32 chars).
  // iron-session validates this at first session access and throws a clear error if absent.
  // Do not add a module-level guard here — Next.js evaluates this module at build time
  // when env vars are not present, which would break the build.
  password: process.env.UTILITIES_SESSION_SECRET ?? "", // empty string causes iron-session to reject at runtime
  cookieName: "utilities_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days — persistent sessions
  },
};
