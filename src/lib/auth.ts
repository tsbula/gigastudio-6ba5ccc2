import { randomBytes, randomInt } from "crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { withDb, type User } from "@/lib/db";

export const SESSION_COOKIE = "set_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней
export const CODE_TTL_MS = 10 * 60 * 1000; // 10 минут
export const CODE_MAX_ATTEMPTS = 5;

export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10) digits = `7${digits}`;
  if (digits.length !== 11 || !digits.startsWith("7")) return null;
  return digits;
}

export function generateLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<void> {
  const id = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await withDb((db) => {
    db.sessions.push({ id, userId, expiresAt });
  });
  // Превью открывает приложение в кросс-доменном iframe: кука с SameSite=Lax
  // туда просто не сохраняется/не отправляется, поэтому для https отдаём
  // SameSite=None; Secure.
  const [store, reqHeaders] = await Promise.all([cookies(), headers()]);
  const isHttps =
    (reqHeaders.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await withDb((db) => {
      db.sessions = db.sessions.filter((s) => s.id !== token);
    });
  }
  store.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return withDb((db) => {
    const session = db.sessions.find((s) => s.id === token);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
    return db.users.find((u) => u.id === session.userId) ?? null;
  });
});
