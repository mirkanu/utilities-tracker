import type { SessionOptions } from "iron-session";

export interface SessionData {
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.UTILITIES_SESSION_SECRET!, // min 32 chars; generated with openssl rand -base64 32
  cookieName: "utilities_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days — persistent sessions
  },
};
