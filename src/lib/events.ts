import { format } from "date-fns";
import { ru } from "date-fns/locale";

import type { DB, EventCancelReason, Signup, VolleyEvent } from "@/lib/db";

/** Выписаться можно не позднее чем за 4 часа до начала. */
export const WITHDRAW_DEADLINE_HOURS = 4;
/** Если в резерве кто-то есть — дедлайн выписки 2 часа. */
export const WITHDRAW_DEADLINE_WITH_RESERVE_HOURS = 2;
/** За 4 часа до начала проверяется минимум участников (автоотмена). */
export const AUTO_CANCEL_HOURS = 4;

export const MIN_DURATION_MIN = 30;
export const MAX_DURATION_MIN = 300;

const hours = (h: number) => h * 60 * 60 * 1000;

export function parseStart(startsAt: string): Date {
  return new Date(startsAt);
}

export function eventEnd(event: VolleyEvent): Date {
  return new Date(parseStart(event.startsAt).getTime() + event.durationMin * 60_000);
}

export type EventStatusKey =
  | "open"
  | "reserve"
  | "ongoing"
  | "finished"
  | "cancelled";

export type EventStatus = {
  key: EventStatusKey;
  label: string;
};

export function getEventStatus(
  event: VolleyEvent,
  activeCount: number,
  now: Date = new Date()
): EventStatus {
  if (event.cancelled) return { key: "cancelled", label: "Отменена" };
  const start = parseStart(event.startsAt);
  const end = eventEnd(event);
  if (now >= end) return { key: "finished", label: "Завершилась" };
  if (now >= start) return { key: "ongoing", label: "Идёт сейчас" };
  if (activeCount >= event.maxPlayers)
    return { key: "reserve", label: "Набор в резерв" };
  return { key: "open", label: "Запись открыта" };
}

export function cancelReasonLabel(reason: EventCancelReason): string {
  return reason === "not_enough_players"
    ? "не набрался минимум участников"
    : "отменена организатором";
}

export function getSignups(db: DB, eventId: string) {
  const relevant = db.signups.filter((s) => s.eventId === eventId);
  const byOrder = (a: Signup, b: Signup) => a.joinedAt.localeCompare(b.joinedAt);
  return {
    active: relevant.filter((s) => s.status === "active").sort(byOrder),
    waitlist: relevant.filter((s) => s.status === "waitlist").sort(byOrder),
    all: relevant,
  };
}

export function activeCount(db: DB, eventId: string): number {
  return db.signups.filter((s) => s.eventId === eventId && s.status === "active")
    .length;
}

export function waitlistCount(db: DB, eventId: string): number {
  return db.signups.filter((s) => s.eventId === eventId && s.status === "waitlist")
    .length;
}

export function findUserSignup(db: DB, eventId: string, userId: string) {
  return db.signups.find(
    (s) => s.eventId === eventId && s.userId === userId && s.status !== "cancelled"
  );
}

/**
 * Выписка активного участника: дедлайн 4 часа до начала, а если в резерве
 * кто-то есть — 2 часа. Возвращает null, если выписаться можно.
 */
export function withdrawBlockReason(
  event: VolleyEvent,
  waiting: number,
  now: Date = new Date()
): string | null {
  const start = parseStart(event.startsAt);
  if (now >= start) return "Тренировка уже началась — выписаться нельзя.";
  const hoursLeft =
    waiting > 0
      ? WITHDRAW_DEADLINE_WITH_RESERVE_HOURS
      : WITHDRAW_DEADLINE_HOURS;
  if (now.getTime() > start.getTime() - hours(hoursLeft)) {
    return waiting > 0
      ? `Дедлайн выписки прошёл: в резерве есть люди, выписаться можно было не позднее чем за ${WITHDRAW_DEADLINE_WITH_RESERVE_HOURS} часа до начала.`
      : `Дедлайн выписки прошёл: выписаться можно было не позднее чем за ${WITHDRAW_DEADLINE_HOURS} часа до начала.`;
  }
  return null;
}

/**
 * Обслуживание: чистит протухшие сессии и коды, отменяет тренировки,
 * у которых за 4 часа до начала не набрался минимум.
 */
export function runMaintenance(db: DB): void {
  const now = Date.now();

  const sessionsBefore = db.sessions.length;
  db.sessions = db.sessions.filter(
    (s) => new Date(s.expiresAt).getTime() > now
  );

  const codesBefore = db.loginCodes.length;
  db.loginCodes = db.loginCodes.filter(
    (c) => new Date(c.expiresAt).getTime() > now
  );

  for (const event of db.events) {
    if (event.cancelled) continue;
    const start = parseStart(event.startsAt).getTime();
    if (now >= start - hours(AUTO_CANCEL_HOURS) && now < start) {
      if (activeCount(db, event.id) < event.minPlayers) {
        event.cancelled = true;
        event.cancelReason = "not_enough_players";
        event.cancelledAt = new Date().toISOString();
      }
    }
  }
}

export function formatEventDate(startsAt: string): string {
  const raw = format(parseStart(startsAt), "EEEE, d MMMM", { locale: ru });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatEventDayShort(startsAt: string): string {
  return format(parseStart(startsAt), "d MMM", { locale: ru });
}

export function formatEventWeekday(startsAt: string): string {
  const raw = format(parseStart(startsAt), "EEEEEE", { locale: ru });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatEventTimeRange(event: VolleyEvent): string {
  const start = parseStart(event.startsAt);
  const end = eventEnd(event);
  return `${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length !== 11) return phone;
  return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}

export function initials(user: { firstName: string; lastName: string }): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

/** Локальное время для <input type="datetime-local"> из Date. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
