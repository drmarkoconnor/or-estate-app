import { SignJWT, jwtVerify } from "jose";
import type { HandlerEvent as NetlifyEvent } from "@netlify/functions";
import { requireEnv } from "./env";

const COOKIE_NAME = "or_session";

export type Session = {
  user_id: string;
  household_id: string;
  email: string;
  exp?: number;
};

export const createSessionCookie = async (payload: Session): Promise<string> => {
  const secret = new TextEncoder().encode(requireEnv("JWT_SECRET"));
  const jwt = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
  // HTTP-only, Secure recommended (Netlify provides HTTPS). SameSite=Lax
  return (
    `${COOKIE_NAME}=${jwt}; Path=/; HttpOnly; SameSite=Lax` +
    (process.env.NODE_ENV === "production" ? "; Secure" : "")
  );
};

export const clearSessionCookie = (): string => {
  return (
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` +
    (process.env.NODE_ENV === "production" ? "; Secure" : "")
  );
};

export const getSession = async (event: NetlifyEvent): Promise<Session | null> => {
  const cookie = (event.headers.cookie as string) || (event.headers.Cookie as string);
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const token = match[1];
  try {
    const secret = new TextEncoder().encode(requireEnv("JWT_SECRET"));
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as Session;
  } catch {
    return null;
  }
};

export const requireAuth = async (event: NetlifyEvent): Promise<Session> => {
  const s = await getSession(event);
  if (!s) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  return s;
};
