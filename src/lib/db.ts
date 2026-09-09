import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { runMaintenance } from "@/lib/events";

export type User = {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  graduationYear: number | null;
  isAdmin: boolean;
  createdAt: string;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: string;
};

export type LoginCode = {
  id: string;
  phone: string;
  code: string;
  attemptsLeft: number;
  expiresAt: string;
  verified: boolean;
};

export type EventCancelReason = "organizer" | "not_enough_players";

export type VolleyEvent = {
  id: string;
  title: string;
  address: string;
  /** Wall-clock start time without timezone: "2025-07-14T19:00" */
  startsAt: string;
  durationMin: number;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  createdBy: string;
  cancelled: boolean;
  cancelReason: EventCancelReason | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type Signup = {
  id: string;
  eventId: string;
  userId: string;
  status: "active" | "waitlist" | "cancelled";
  joinedAt: string;
};

export type DB = {
  users: User[];
  sessions: Session[];
  loginCodes: LoginCode[];
  events: VolleyEvent[];
  signups: Signup[];
};

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function emptyDb(): DB {
  return { users: [], sessions: [], loginCodes: [], events: [], signups: [] };
}

let loaded: Promise<DB> | null = null;

async function loadDb(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DB>;
    return { ...emptyDb(), ...parsed };
  } catch {
    return emptyDb();
  }
}

async function saveDb(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

let tail: Promise<unknown> = Promise.resolve();

/**
 * Serialized access to the JSON database. Every call runs maintenance
 * (rule checks) first and persists the state afterwards, so concurrent
 * clicks can never interleave reads and writes.
 */
export function withDb<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = tail.then(async () => {
    if (!loaded) loaded = loadDb();
    const db = await loaded;
    runMaintenance(db);
    const result = await fn(db);
    await saveDb(db);
    return result;
  });
  tail = run.catch(() => undefined);
  return run;
}
