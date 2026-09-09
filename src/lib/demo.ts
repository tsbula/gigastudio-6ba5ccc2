import { randomUUID } from "crypto";

import { withDb, type DB, type User } from "@/lib/db";
import { eventEnd } from "@/lib/events";

export type DemoRole = "admin" | "member";

type DemoPerson = {
  firstName: string;
  lastName: string;
  graduationYear: number | null;
  phone: string;
};

const DEMO_PEOPLE: DemoPerson[] = [
  { firstName: "Алексей", lastName: "Волков", graduationYear: 2015, phone: "79111002001" },
  { firstName: "Мария", lastName: "Соколова", graduationYear: 2018, phone: "79111002002" },
  { firstName: "Дмитрий", lastName: "Орлов", graduationYear: 2016, phone: "79111002003" },
  { firstName: "Анна", lastName: "Крылова", graduationYear: 2019, phone: "79111002004" },
  { firstName: "Сергей", lastName: "Морозов", graduationYear: 2014, phone: "79111002005" },
  { firstName: "Полина", lastName: "Лебедева", graduationYear: 2017, phone: "79111002006" },
  { firstName: "Игорь", lastName: "Стрелков", graduationYear: null, phone: "79111002007" },
  { firstName: "Ольга", lastName: "Виноградова", graduationYear: 2020, phone: "79111002008" },
  { firstName: "Никита", lastName: "Зайцев", graduationYear: 2015, phone: "79111002009" },
  { firstName: "Екатерина", lastName: "Белова", graduationYear: null, phone: "79111002010" },
];

const DEMO_EVENT_IDS = ["demo-1", "demo-2"];

function startsAtIn(days: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function freshEvents(adminId: string) {
  return [
    {
      id: "demo-1",
      title: "Вечерний сет в зале на Школьной",
      address: "Спортзал школы № 302, ул. Школьная, 8",
      startsAt: startsAtIn(1, 19, 30),
      durationMin: 90,
      minPlayers: 6,
      maxPlayers: 8,
      description:
        "Классический вечерний сет: разминочка, две партии до 25 и игра на счёт. Мячи и форма свои, настроение — любое.",
      createdBy: adminId,
      cancelled: false,
      cancelReason: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-2",
      title: "Утренний турнир выходного дня",
      address: "Спорткомплекс «Олимп», ул. Академика Королёва, 12",
      startsAt: startsAtIn(3, 11, 0),
      durationMin: 120,
      minPlayers: 6,
      maxPlayers: 8,
      description:
        "Два часа игры в утренний слот: короткая разминка, микс-команды и мини-турнир до трёх побед. Приходите чуть заранее.",
      createdBy: adminId,
      cancelled: false,
      cancelReason: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Готовит демо-данные: 10 игроков и 2 тренировки с полным составом
 * и очередью резерва. Если демо-тренировки уже завершились или были
 * отменены, они пересоздаются с новыми датами, чтобы демо всегда
 * показывало живые сценарии.
 */
export function ensureDemoData(db: DB, role: DemoRole): string {
  const users: User[] = DEMO_PEOPLE.map((person, index) => {
    const existing = db.users.find((u) => u.phone === person.phone);
    if (existing) return existing;
    const user: User = {
      id: `demo-user-${index + 1}`,
      phone: person.phone,
      firstName: person.firstName,
      lastName: person.lastName,
      graduationYear: person.graduationYear,
      isAdmin: index === 0,
      createdAt: new Date(Date.now() - (24 + index) * 3600_000).toISOString(),
    };
    db.users.push(user);
    return user;
  });

  const admin = users[0];

  const stale =
    db.events.filter((e) => DEMO_EVENT_IDS.includes(e.id)).length !==
      DEMO_EVENT_IDS.length ||
    db.events
      .filter((e) => DEMO_EVENT_IDS.includes(e.id))
      .some((e) => e.cancelled || eventEnd(e).getTime() <= Date.now());

  if (stale) {
    db.events = db.events.filter((e) => !DEMO_EVENT_IDS.includes(e.id));
    db.signups = db.signups.filter((s) => !DEMO_EVENT_IDS.includes(s.eventId));
    db.events.push(...freshEvents(admin.id));
    const t = Date.now() - 26 * 3600_000;
    const join = (offsetMin: number) =>
      new Date(t + offsetMin * 60_000).toISOString();

    // demo-1: полный состав 8/8, резерв 9 и 10.
    users.slice(0, 8).forEach((user, i) =>
      db.signups.push({
        id: randomUUID(),
        eventId: "demo-1",
        userId: user.id,
        status: "active",
        joinedAt: join(i * 7),
      })
    );
    users.slice(8, 10).forEach((user, i) =>
      db.signups.push({
        id: randomUUID(),
        eventId: "demo-1",
        userId: user.id,
        status: "waitlist",
        joinedAt: join(60 + i * 5),
      })
    );

    // demo-2: полный состав 8/8 (игроки 3–10), Мария — первая в резерве.
    users.slice(2, 10).forEach((user, i) =>
      db.signups.push({
        id: randomUUID(),
        eventId: "demo-2",
        userId: user.id,
        status: "active",
        joinedAt: join(i * 6),
      })
    );
    db.signups.push({
      id: randomUUID(),
      eventId: "demo-2",
      userId: users[1].id,
      status: "waitlist",
      joinedAt: join(90),
    });
  }

  return role === "admin" ? admin.id : users[1].id;
}

export async function demoLoginUserId(role: DemoRole): Promise<string> {
  return withDb((db) => ensureDemoData(db, role));
}
